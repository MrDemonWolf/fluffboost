import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { MIGRATIONS_FOLDER, createPostgresSession, runMigrations } from "../src/database/migrator.js";
import { guilds, motivationQuotes, suggestionQuotes } from "../src/database/schema.js";
import { requireSafeE2EDatabaseUrl } from "./databaseSafety.js";

/**
 * Upgrade path for the production database: build a scratch database at the
 * current production baseline (0000 only) with the real migrator, seed it with
 * representative rows (duplicate quotes, naive `timestamp` values), then run
 * the real migrator over the full folder, exactly as the container entrypoint
 * does on deploy, and check that values, counts and constraints come out right.
 */
const adminUrl = requireSafeE2EDatabaseUrl(
  process.env["E2E_DATABASE_URL"],
  process.env["E2E_DATABASE_DISPOSABLE"],
);
// A dedicated database: the migrations run unmodified against its public schema.
const databaseName = `fluffboost_e2e_migrate_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
const databaseUrl = (() => {
  const url = new URL(adminUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
})();

const admin = postgres(adminUrl, { max: 1, connect_timeout: 5, onnotice: () => {} });
let sql: postgres.Sql;
let baselineFolder: string | undefined;
let databaseCreated = false;

const ids = {
  dupOldest: "00000000-0000-4000-8000-000000000001",
  dupMiddle: "00000000-0000-4000-8000-000000000002",
  dupNewest: "00000000-0000-4000-8000-000000000003",
  tieLowId: "00000000-0000-4000-8000-000000000004",
  tieHighId: "00000000-0000-4000-8000-000000000005",
  caseVariant: "00000000-0000-4000-8000-000000000006",
  unique: "00000000-0000-4000-8000-000000000007",
  long: "00000000-0000-4000-8000-000000000008",
  premiumGuild: "00000000-0000-4000-8000-0000000000a1",
  freeGuild: "00000000-0000-4000-8000-0000000000a2",
};
// 1024 three-byte characters: 3072 bytes, over the 2704-byte btree row limit
// for a plain index on "quote" (the md5() expression index has no such limit).
const longQuote = "穏".repeat(1024);

/** Migrations folder holding only 0000: the schema production runs today. */
async function writeBaselineFolder(): Promise<string> {
  const folder = await mkdtemp(path.join(tmpdir(), "fluffboost-baseline-"));
  await mkdir(path.join(folder, "meta"));
  const journal = JSON.parse(await readFile(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"));
  const [baseline] = journal.entries as { tag: string }[];
  expect(baseline?.tag).toStartWith("0000_");
  await writeFile(path.join(folder, "meta", "_journal.json"), JSON.stringify({ ...journal, entries: [baseline] }));
  await copyFile(path.join(MIGRATIONS_FOLDER, `${baseline!.tag}.sql`), path.join(folder, `${baseline!.tag}.sql`));
  return folder;
}

async function migrate(folder: string = MIGRATIONS_FOLDER): Promise<void> {
  await runMigrations(createPostgresSession(databaseUrl), folder);
}

async function seedBaseline(): Promise<void> {
  // Naive `timestamp` literals, the way the baseline schema stores UTC instants.
  await sql`
    INSERT INTO "MotivationQuote" ("id", "quote", "author", "addedBy", "createdAt") VALUES
      (${ids.dupMiddle}, 'Keep going.', 'Second', 'u1', '2025-02-01 00:00:00'),
      (${ids.dupOldest}, 'Keep going.', 'First', 'u1', '2025-01-01 00:00:00'),
      (${ids.dupNewest}, 'Keep going.', 'Third', 'u1', '2025-03-01 00:00:00'),
      (${ids.tieHighId}, 'Rest is progress.', 'High id', 'u2', '2025-04-01 12:00:00'),
      (${ids.tieLowId}, 'Rest is progress.', 'Low id', 'u2', '2025-04-01 12:00:00'),
      (${ids.caseVariant}, 'keep going.', 'Lowercase', 'u3', '2024-12-01 00:00:00'),
      (${ids.unique}, 'One small step still moves you forward.', 'Solo', 'u4', '2025-05-01 08:30:00.123'),
      (${ids.long}, ${longQuote}, 'Long', 'u5', '2025-06-01 00:00:00')`;
  await sql`
    INSERT INTO "Guild" ("id", "guildId", "motivationChannelId", "motivationTime", "timezone",
      "lastMotivationSentAt", "isPremium", "joinedAt", "updatedAt") VALUES
      (${ids.premiumGuild}, '100000000000000111', '100000000000000222', '22:00', 'Europe/London',
        '2026-10-02 21:00:00.456', true, '2025-01-01 00:00:00', '2026-10-02 21:00:00.456'),
      (${ids.freeGuild}, '100000000000000112', NULL, '08:00', 'America/Chicago',
        NULL, false, '2025-01-02 00:00:00', '2025-01-02 00:00:00')`;
  await sql`
    INSERT INTO "SuggestionQuote" ("quote", "author", "addedBy", "status", "reviewedBy", "reviewedAt",
      "createdAt", "updatedAt")
    SELECT 'Suggestion ' || n, 'Author', 'u' || n,
      (ARRAY['Pending', 'Approved', 'Rejected'])[1 + n % 3]::"SuggestionStatus",
      CASE WHEN n % 3 = 0 THEN NULL ELSE 'reviewer' END,
      CASE WHEN n % 3 = 0 THEN NULL ELSE '2025-07-01 00:00:00'::timestamp END,
      '2025-01-01 00:00:00'::timestamp + n * interval '1 hour', '2025-07-01 00:00:00'
    FROM generate_series(1, 60) AS n`;
}

beforeAll(async () => {
  await admin.unsafe(`CREATE DATABASE "${databaseName}"`);
  databaseCreated = true;
  sql = postgres(databaseUrl, { max: 2, connect_timeout: 5, onnotice: () => {} });
  baselineFolder = await writeBaselineFolder();
  await migrate(baselineFolder);
  await seedBaseline();
  await migrate();
}, 60_000);

afterAll(async () => {
  await sql?.end();
  if (databaseCreated) {
    await admin.unsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
  }
  await admin.end();
  if (baselineFolder) {
    await rm(baselineFolder, { recursive: true, force: true });
  }
});

describe("migrations from the production baseline", () => {
  test("records every migration, and a second run is a no-op", async () => {
    const journal = JSON.parse(await readFile(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"));
    const count = async () => (await sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`)[0]?.["n"];
    expect(await count()).toBe(journal.entries.length);
    await migrate();
    expect(await count()).toBe(journal.entries.length);
  });

  test("dedupes quote text keeping the oldest row (id breaks createdAt ties) and nothing else", async () => {
    const rows = await sql<{ id: string; author: string }[]>`
      SELECT "id", "author" FROM "MotivationQuote" ORDER BY "id"`;
    expect(rows.map((row) => row.id)).toEqual([ids.dupOldest, ids.tieLowId, ids.caseVariant, ids.unique, ids.long]);
    expect(rows.find((row) => row.id === ids.dupOldest)?.author).toBe("First");
    // Exact-text uniqueness: a case variant is a different quote.
    expect(rows.find((row) => row.id === ids.caseVariant)?.author).toBe("Lowercase");
    const [long] = await sql`SELECT octet_length("quote") AS bytes FROM "MotivationQuote" WHERE "id" = ${ids.long}`;
    expect(long?.["bytes"]).toBe(3072);
  });

  test("the unique index rejects a duplicate and onConflictDoNothing skips it", async () => {
    let code: unknown;
    try {
      await sql`INSERT INTO "MotivationQuote" ("quote", "author", "addedBy") VALUES ('Keep going.', 'Again', 'u9')`;
    } catch (err) {
      code = (err as { code?: string }).code;
    }
    expect(code).toBe("23505");
    const db = drizzle(sql);
    const inserted = await db.insert(motivationQuotes)
      .values({ quote: longQuote, author: "Again", addedBy: "u9" }).onConflictDoNothing().returning();
    expect(inserted).toEqual([]);
    const fresh = await db.insert(motivationQuotes)
      .values({ quote: "A brand new quote.", author: "New", addedBy: "u9" }).onConflictDoNothing().returning();
    expect(fresh).toHaveLength(1);
    const [{ n } = { n: 0 }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM "MotivationQuote"`;
    expect(n).toBe(6);
  });

  test("adds a nullable timestamptz premiumEndsAt and leaves existing guild rows unchanged", async () => {
    const columns = await sql<{ column_name: string; data_type: string; is_nullable: string }[]>`
      SELECT column_name, data_type, is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'Guild' ORDER BY column_name`;
    const types = Object.fromEntries(columns.map((c) => [c.column_name, `${c.data_type} ${c.is_nullable}`]));
    expect(types["premiumEndsAt"]).toBe("timestamp with time zone YES");
    // Existing columns keep their baseline type (no timestamp -> timestamptz conversion here).
    expect(types["lastMotivationSentAt"]).toBe("timestamp without time zone YES");
    expect(types["joinedAt"]).toBe("timestamp without time zone NO");

    const raw = await sql`
      SELECT "guildId", "isPremium", "premiumEndsAt", "lastMotivationSentAt"::text AS last, "joinedAt"::text AS joined
      FROM "Guild" ORDER BY "guildId"`;
    expect(raw.map((row) => ({ ...row }))).toEqual([
      { guildId: "100000000000000111", isPremium: true, premiumEndsAt: null,
        last: "2026-10-02 21:00:00.456", joined: "2025-01-01 00:00:00" },
      { guildId: "100000000000000112", isPremium: false, premiumEndsAt: null,
        last: null, joined: "2025-01-02 00:00:00" },
    ]);
  });

  test("the bot's Drizzle schema reads naive timestamps as UTC and round-trips premiumEndsAt", async () => {
    const db = drizzle(sql);
    const [guild] = await db.select().from(guilds).where(eq(guilds.id, ids.premiumGuild));
    expect(guild?.lastMotivationSentAt?.toISOString()).toBe("2026-10-02T21:00:00.456Z");
    expect(guild?.joinedAt.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    // A null end keeps the existing premium flag in effect after the deploy.
    expect(guild?.premiumEndsAt).toBeNull();

    const endsAt = new Date("2026-11-03T17:45:12.345Z");
    // A non-UTC session must not shift the instant: the column carries its offset.
    const chicago = postgres(databaseUrl, { max: 1, connection: { TimeZone: "America/Chicago" } });
    try {
      const chicagoDb = drizzle(chicago);
      await chicagoDb.update(guilds).set({ premiumEndsAt: endsAt }).where(eq(guilds.id, ids.premiumGuild));
      const [inChicago] = await chicagoDb.select({ premiumEndsAt: guilds.premiumEndsAt }).from(guilds)
        .where(eq(guilds.id, ids.premiumGuild));
      expect(inChicago?.premiumEndsAt?.toISOString()).toBe(endsAt.toISOString());
    } finally {
      await chicago.end();
    }
    const [stored] = await sql`SELECT "premiumEndsAt" AT TIME ZONE 'UTC' AS utc FROM "Guild" WHERE "id" = ${ids.premiumGuild}`;
    expect(String(stored?.["utc"])).toContain("17:45:12");
  });

  test("an old-image write (no premiumEndsAt column) still inserts", async () => {
    await sql`INSERT INTO "Guild" ("guildId", "isPremium") VALUES ('100000000000000113', true)`;
    const [row] = await sql`SELECT "premiumEndsAt" FROM "Guild" WHERE "guildId" = '100000000000000113'`;
    expect(row?.["premiumEndsAt"]).toBeNull();
  });

  test("keeps the suggestion rows and serves the paged list queries from the new indexes", async () => {
    const [{ n } = { n: 0 }] = await sql<{ n: number }[]>`SELECT count(*)::int AS n FROM "SuggestionQuote"`;
    expect(n).toBe(60);
    const indexes = await sql<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname`;
    const names = indexes.map((i) => i.indexname);
    expect(names).toEqual(expect.arrayContaining([
      "motivation_quote_text_unique", "suggestion_status_created_idx", "suggestion_created_idx",
      "suggestion_status_idx", "guild_motivation_channel_idx",
    ]));
    expect(indexes.find((i) => i.indexname === "motivation_quote_text_unique")?.indexdef)
      .toContain("UNIQUE INDEX motivation_quote_text_unique ON public.\"MotivationQuote\" USING btree (md5(quote))");

    // The exact queries /admin suggestion list builds, planned with seq scans
    // discouraged (the table is tiny here): each must read in index order,
    // with no separate Sort step.
    const db = drizzle(sql);
    const base = () => db.select().from(suggestionQuotes)
      .orderBy(desc(suggestionQuotes.createdAt), desc(suggestionQuotes.id));
    const planner = postgres(databaseUrl, { max: 1, connection: { enable_seqscan: "off" } });
    const explain = async (query: { toSQL: () => { sql: string; params: unknown[] } }) => {
      const { sql: text, params } = query.toSQL();
      const rows = await planner.unsafe(`EXPLAIN ${text}`, params as never[]);
      return rows.map((row) => String(row["QUERY PLAN"])).join("\n");
    };
    let plans: { filtered: string; all: string };
    try {
      plans = {
        filtered: await explain(base().where(eq(suggestionQuotes.status, "Pending")).limit(26).offset(25)),
        all: await explain(base().limit(26).offset(0)),
      };
    } finally {
      await planner.end();
    }
    expect(plans.filtered).toContain("Index Scan Backward using suggestion_status_created_idx");
    expect(plans.filtered).not.toContain("Sort");
    expect(plans.all).toContain("Index Scan Backward using suggestion_created_idx");
    expect(plans.all).not.toContain("Sort");

    const page = await base().where(eq(suggestionQuotes.status, "Pending")).limit(3);
    expect(page.map((s) => s.quote)).toEqual(["Suggestion 60", "Suggestion 57", "Suggestion 54"]);
  });
});
