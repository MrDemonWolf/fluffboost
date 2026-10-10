-- Reconcile a legacy FluffBoost database (Prisma era, or built with
-- `drizzle-kit push`) to the current schema and record the Drizzle baseline.
--
-- Run it ONLY after `pg_dump --format=custom` and with the bot stopped, through
-- `bun run db:reconcile --confirm` (apps/discord/scripts/reconcileLegacySchema.ts)
-- or: psql -X -v ON_ERROR_STOP=1 -d "$DATABASE_URL" -f reconcileLegacySchema.sql
--
-- Everything runs in ONE transaction: any error rolls the database back to its
-- previous state. It refuses a database that already has Drizzle migration
-- history (already baselined or migrated) and one without public."Guild".
--
--   A. Rename the legacy tables, their constraints/indexes and enum types to _legacy_*.
--   B. Run drizzle/0000_confused_eternity.sql verbatim (a unit test checks it).
--   C. Copy every row, column by column where the name still exists, mapping
--      values (enum labels case-insensitively, "M H * * *" cron times to HH:mm,
--      text ids to uuid, timestamptz to UTC timestamp, NULLs to the column
--      default). Unknown enum values, non-UUID ids, malformed times, duplicate
--      keys or a row-count mismatch abort with a clear error. Legacy columns
--      the current schema lacks (e.g. SuggestionQuote.guildId from the early
--      Prisma era) are dropped with their values; a NOTICE lists them.
--      Then drop the _legacy_* objects and public._prisma_migrations.
--   D. Record the 0000 baseline row exactly as Drizzle's migrator would
--      (SHA-256 of the 0000 file, `when` from drizzle/meta/_journal.json).

BEGIN;
SET LOCAL lock_timeout = '60s';

-- Part A: guards, then move the legacy objects out of the way.
DO $reconcile_a$
DECLARE
  t text;
  r record;
  has_rows boolean;
BEGIN
  IF to_regclass('drizzle.__drizzle_migrations') IS NOT NULL THEN
    EXECUTE 'SELECT EXISTS (SELECT 1 FROM drizzle.__drizzle_migrations)' INTO has_rows;
    IF has_rows THEN
      RAISE EXCEPTION 'Refusing to reconcile: drizzle.__drizzle_migrations already has rows, so this database is already baselined or migrated. Run migrate.ts instead.';
    END IF;
  END IF;
  IF to_regclass('public."Guild"') IS NULL THEN
    RAISE EXCEPTION 'Refusing to reconcile: public."Guild" does not exist, so there is no legacy schema here. Run migrate.ts on an empty database instead.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class k JOIN pg_namespace n ON n.oid = k.relnamespace
             WHERE n.nspname = 'public' AND k.relname LIKE '\_legacy\_%')
     OR EXISTS (SELECT 1 FROM pg_type y JOIN pg_namespace n ON n.oid = y.typnamespace
                WHERE n.nspname = 'public' AND y.typname LIKE '\_legacy\_%') THEN
    RAISE EXCEPTION 'Refusing to reconcile: public already contains _legacy_* objects; inspect and remove them first.';
  END IF;

  FOREACH t IN ARRAY ARRAY['Guild', 'MotivationQuote', 'SuggestionQuote', 'DiscordActivity'] LOOP
    IF to_regclass(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', t, '_legacy_' || t);
    END IF;
  END LOOP;
  -- Constraint names (Guild_pkey, Guild_guildId_key, ...) would collide with 0000's.
  FOR r IN SELECT c.conname, c.conrelid::regclass AS tbl FROM pg_constraint c
           JOIN pg_class k ON k.oid = c.conrelid JOIN pg_namespace n ON n.oid = k.relnamespace
           WHERE n.nspname = 'public' AND k.relname LIKE '\_legacy\_%' LOOP
    EXECUTE format('ALTER TABLE %s RENAME CONSTRAINT %I TO %I', r.tbl, r.conname, '_legacy_' || r.conname);
  END LOOP;
  FOR r IN SELECT i.relname FROM pg_index x JOIN pg_class i ON i.oid = x.indexrelid
           JOIN pg_class k ON k.oid = x.indrelid JOIN pg_namespace n ON n.oid = k.relnamespace
           WHERE n.nspname = 'public' AND k.relname LIKE '\_legacy\_%' AND i.relname NOT LIKE '\_legacy\_%' LOOP
    EXECUTE format('ALTER INDEX public.%I RENAME TO %I', r.relname, '_legacy_' || r.relname);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['DiscordActivityType', 'MotivationFrequency', 'SuggestionStatus'] LOOP
    IF to_regtype(format('public.%I', t)) IS NOT NULL THEN
      EXECUTE format('ALTER TYPE public.%I RENAME TO %I', t, '_legacy_' || t);
    END IF;
  END LOOP;
END
$reconcile_a$;

-- Part B: drizzle/0000_confused_eternity.sql, verbatim.
-- >>> BEGIN 0000_confused_eternity.sql
CREATE TYPE "public"."DiscordActivityType" AS ENUM('Custom', 'Listening', 'Streaming', 'Playing');--> statement-breakpoint
CREATE TYPE "public"."MotivationFrequency" AS ENUM('Daily', 'Weekly', 'Monthly');--> statement-breakpoint
CREATE TYPE "public"."SuggestionStatus" AS ENUM('Pending', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TABLE "DiscordActivity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity" text NOT NULL,
	"type" "DiscordActivityType" DEFAULT 'Custom' NOT NULL,
	"url" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Guild" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guildId" text NOT NULL,
	"motivationChannelId" text,
	"motivationFrequency" "MotivationFrequency" DEFAULT 'Daily' NOT NULL,
	"motivationTime" text DEFAULT '08:00' NOT NULL,
	"motivationDay" integer,
	"timezone" text DEFAULT 'America/Chicago' NOT NULL,
	"lastMotivationSentAt" timestamp,
	"isPremium" boolean DEFAULT false NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Guild_guildId_unique" UNIQUE("guildId")
);
--> statement-breakpoint
CREATE TABLE "MotivationQuote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote" text NOT NULL,
	"author" text NOT NULL,
	"addedBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SuggestionQuote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote" text NOT NULL,
	"author" text NOT NULL,
	"addedBy" text NOT NULL,
	"status" "SuggestionStatus" DEFAULT 'Pending' NOT NULL,
	"reviewedBy" text,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "guild_motivation_channel_idx" ON "Guild" USING btree ("motivationChannelId");--> statement-breakpoint
CREATE INDEX "suggestion_status_idx" ON "SuggestionQuote" USING btree ("status");
-- <<< END 0000_confused_eternity.sql

-- Part C: validate and copy every legacy row, then drop the legacy objects.
DO $reconcile_c$
DECLARE
  t text;
  legacy text;
  c record;
  k record;
  src text;
  e text;
  cols text;
  exprs text;
  bad text;
  dropped text;
  n_old bigint;
  n_new bigint;
BEGIN
  FOREACH t IN ARRAY ARRAY['Guild', 'MotivationQuote', 'SuggestionQuote', 'DiscordActivity'] LOOP
    legacy := '_legacy_' || t;
    CONTINUE WHEN to_regclass(format('public.%I', legacy)) IS NULL;
    cols := '';
    exprs := '';

    FOR c IN
      SELECT a.attname, a.attnotnull, a.atttypid, format_type(a.atttypid, a.atttypmod) AS typ, ty.typtype,
             pg_get_expr(d.adbin, d.adrelid) AS def, format_type(b.atttypid, b.atttypmod) AS src_typ,
             bt.typtype AS src_typtype
      FROM pg_attribute a
      JOIN pg_type ty ON ty.oid = a.atttypid
      JOIN pg_attribute b ON b.attrelid = format('public.%I', legacy)::regclass AND b.attname = a.attname
                         AND b.attnum > 0 AND NOT b.attisdropped
      JOIN pg_type bt ON bt.oid = b.atttypid
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = format('public.%I', t)::regclass AND a.attnum > 0 AND NOT a.attisdropped
      ORDER BY a.attnum
    LOOP
      src := format('l.%I', c.attname);

      IF c.typtype = 'e' THEN
        -- Enum labels match case-insensitively (Prisma's 'pending', 'CUSTOM', ...).
        e := format('(SELECT x.enumlabel FROM pg_enum x WHERE x.enumtypid = %s AND lower(x.enumlabel) = lower(%s::text))',
                    c.atttypid, src);
        EXECUTE format('SELECT string_agg(DISTINCT %1$s::text, '', '') FROM public.%2$I l WHERE %1$s IS NOT NULL AND %3$s IS NULL',
                       src, legacy, e) INTO bad;
        IF bad IS NOT NULL THEN
          RAISE EXCEPTION USING
            MESSAGE = format('Cannot reconcile: %s.%s has value(s) [%s] with no equivalent in the current %s enum [%s].',
                             t, c.attname, bad, c.typ,
                             (SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder) FROM pg_enum WHERE enumtypid = c.atttypid)),
            HINT = format('Nothing was changed. Update or delete those rows (UPDATE %I SET %I = ... WHERE %I = ...), then rerun.',
                          t, c.attname, c.attname);
        END IF;
        e := format('(%s)::%s', e, c.typ);
      ELSIF t = 'Guild' AND c.attname = 'motivationTime' THEN
        -- Prisma-era cron default '0 8 * * *' (and any 'M H * * *') becomes 'HH:mm'.
        e := format($f$(CASE WHEN %1$s::text ~ '^[0-9]{1,2} [0-9]{1,2} [*] [*] [*]$'
                       THEN lpad(split_part(%1$s::text, ' ', 2), 2, '0') || ':' || lpad(split_part(%1$s::text, ' ', 1), 2, '0')
                       ELSE %1$s::text END)$f$, src);
        EXECUTE format($f$SELECT string_agg(DISTINCT %1$s::text, ', ') FROM public.%2$I l
                         WHERE %1$s IS NOT NULL AND %3$s !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'$f$, src, legacy, e) INTO bad;
        IF bad IS NOT NULL THEN
          RAISE EXCEPTION USING
            MESSAGE = format('Cannot reconcile: Guild.motivationTime has value(s) [%s] that are neither HH:mm nor "M H * * *".', bad),
            HINT = 'Nothing was changed. Fix those rows, then rerun.';
        END IF;
      ELSIF c.typ = 'uuid' AND c.src_typ <> 'uuid' THEN
        EXECUTE format($f$SELECT string_agg(v, ', ') FROM (SELECT DISTINCT %1$s::text AS v FROM public.%2$I l
                         WHERE %1$s IS NOT NULL
                           AND %1$s::text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                         ORDER BY 1 LIMIT 5) s$f$, src, legacy) INTO bad;
        IF bad IS NOT NULL THEN
          RAISE EXCEPTION USING
            MESSAGE = format('Cannot reconcile: %s.%s has non-UUID value(s) [%s].', t, c.attname, bad),
            HINT = 'Nothing was changed. The current schema stores ids as uuid; replace those ids, then rerun.';
        END IF;
        e := format('(%s::text)::uuid', src);
      ELSIF c.src_typ = 'timestamp with time zone' AND c.typ LIKE 'timestamp%without time zone' THEN
        e := format('(%s AT TIME ZONE ''UTC'')', src);
      ELSIF c.src_typtype = 'e' THEN
        e := format('(%s::text)::%s', src, c.typ);
      ELSE
        e := format('(%s)::%s', src, c.typ);
      END IF;

      IF c.attnotnull THEN
        IF c.def IS NOT NULL THEN
          e := format('COALESCE(%s, %s)', e, c.def);
        ELSE
          EXECUTE format('SELECT count(*) FROM public.%I l WHERE %s IS NULL', legacy, src) INTO n_old;
          IF n_old > 0 THEN
            RAISE EXCEPTION 'Cannot reconcile: %.% is NULL in % row(s) but is NOT NULL without a default now.',
              t, c.attname, n_old;
          END IF;
        END IF;
      END IF;

      cols := cols || CASE WHEN cols = '' THEN '' ELSE ', ' END || format('%I', c.attname);
      exprs := exprs || CASE WHEN exprs = '' THEN '' ELSE ', ' END || e;
    END LOOP;

    -- Keys the legacy table may no longer enforce (a failed drizzle-kit push drops them midway).
    FOR k IN SELECT con.conname, array_agg(att.attname ORDER BY att.attnum) AS keycols
             FROM pg_constraint con
             JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
             WHERE con.conrelid = format('public.%I', t)::regclass AND con.contype IN ('p', 'u')
             GROUP BY con.conname LOOP
      CONTINUE WHEN EXISTS (SELECT 1 FROM unnest(k.keycols) kc
                            WHERE NOT EXISTS (SELECT 1 FROM pg_attribute b
                                              WHERE b.attrelid = format('public.%I', legacy)::regclass
                                                AND b.attname = kc AND b.attnum > 0 AND NOT b.attisdropped));
      EXECUTE format('SELECT string_agg(v, ''; '') FROM (SELECT concat_ws('', '', %1$s) AS v FROM public.%2$I l GROUP BY %1$s HAVING count(*) > 1 ORDER BY 1 LIMIT 5) s',
                     (SELECT string_agg(format('l.%I::text', kc), ', ') FROM unnest(k.keycols) kc), legacy) INTO bad;
      IF bad IS NOT NULL THEN
        RAISE EXCEPTION USING
          MESSAGE = format('Cannot reconcile: %s has duplicate (%s) value(s) [%s], which %s forbids.',
                           t, array_to_string(k.keycols, ', '), bad, k.conname),
          HINT = 'Nothing was changed. Merge or delete the duplicate rows, then rerun.';
      END IF;
    END LOOP;

    SELECT string_agg(format('%I', b.attname), ', ' ORDER BY b.attnum) INTO dropped
    FROM pg_attribute b
    WHERE b.attrelid = format('public.%I', legacy)::regclass AND b.attnum > 0 AND NOT b.attisdropped
      AND NOT EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = format('public.%I', t)::regclass
                        AND a.attname = b.attname AND a.attnum > 0 AND NOT a.attisdropped);
    IF dropped IS NOT NULL THEN
      RAISE NOTICE '%: legacy column(s) % are not in the current schema; their values are dropped.', t, dropped;
    END IF;

    EXECUTE format('INSERT INTO public.%I (%s) SELECT %s FROM public.%I l', t, cols, exprs, legacy);
    EXECUTE format('SELECT count(*) FROM public.%I', legacy) INTO n_old;
    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n_new;
    IF n_old <> n_new THEN
      RAISE EXCEPTION 'Cannot reconcile: %: copied % of % rows.', t, n_new, n_old;
    END IF;
    RAISE NOTICE '%: % of % row(s) copied (columns: %).', t, n_new, n_old, cols;
  END LOOP;

  FOREACH t IN ARRAY ARRAY['SuggestionQuote', 'DiscordActivity', 'MotivationQuote', 'Guild'] LOOP
    EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', '_legacy_' || t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['DiscordActivityType', 'MotivationFrequency', 'SuggestionStatus'] LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I', '_legacy_' || t);
  END LOOP;
  DROP TABLE IF EXISTS public._prisma_migrations;

  IF EXISTS (SELECT 1 FROM pg_class rel JOIN pg_namespace ns ON ns.oid = rel.relnamespace
             WHERE ns.nspname = 'public' AND rel.relname LIKE '\_legacy\_%') THEN
    RAISE EXCEPTION 'Cannot reconcile: _legacy_* relations are still present after the copy.';
  END IF;
END
$reconcile_c$;

-- Part D: record the baseline exactly as Drizzle's migrator does for 0000.
-- hash = SHA-256 of drizzle/0000_confused_eternity.sql; created_at = its journal `when`.
CREATE SCHEMA IF NOT EXISTS drizzle;
CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash text NOT NULL,
  created_at bigint
);
INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
VALUES ('9289c18010701751cde68a6c7bffb56e87090393725f50e8d903467bdce1cb93', 1785275510784);

COMMIT;
