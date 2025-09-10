# Prisma schema vs migrations — comparison

Date: 2025-09-08

This document summarizes differences between `prisma/schema.prisma` and the SQL migrations present in `prisma/migrations/`.

## Checklist

- [x] Read all migration SQL files provided in `prisma/migrations/`.
- [x] Compared reconstructed DB shape from migrations to `prisma/schema.prisma`.
- [x] Listed mismatches, impact, and suggested fixes/commands.

## High-level summary

The migrations mostly match `schema.prisma`, but there are two substantive mismatches in the `SuggestionQuote` model:

1. The DB (per migrations) contains a `guildId` column on `SuggestionQuote` (initial migration) and later a migration drops the FK constraint but not the column; however `schema.prisma` has no `guildId` field.
2. `schema.prisma` adds an `updatedAt` field to `SuggestionQuote` (annotated `@updatedAt`) but migrations do not include an `updatedAt` column for `SuggestionQuote`.

Other items:

- `DiscordActivityType` enum: migrations were updated to use capitalized PascalCase values (`Custom`, `Listening`, `Streaming`, `Playing`) and `schema.prisma` matches that final state.
- `Guild.motivationChannelId` was introduced by a migration (the migration warns that the original `motivationChannel` column was dropped and replaced by `motivationChannelId`); `schema.prisma` matches the final name.

## Detailed findings

### 1) SuggestionQuote.guildId

- Migrations (20250716060338_init): `SuggestionQuote` created with `guildId TEXT NOT NULL` and a FK to `Guild(id)`.
- Migrations (20250716063848_refactor_suggestion_quote_relation): contains `ALTER TABLE "SuggestionQuote" DROP CONSTRAINT "SuggestionQuote_guildId_fkey";` — the FK was removed, but no migration removes the `guildId` column itself.
- `prisma/schema.prisma`: `SuggestionQuote` has no `guildId` field or relation.

Impact: The database likely still has a `guildId` column but Prisma does not expect it. This causes Prisma Client to detect drift and may break migrations or queries that rely on the model shape.

Resolution options:

- If you want to remove the column from the DB: create a migration that drops `guildId` from `SuggestionQuote`.
- If you want to keep the relation: add `guildId` and a relation back into `schema.prisma` and re-generate the client.

### 2) SuggestionQuote.updatedAt

- `schema.prisma` defines `updatedAt DateTime @updatedAt` on `SuggestionQuote`.
- The initial migration created only `createdAt TIMESTAMP(3)` for `SuggestionQuote`; I did not find any migration that adds `updatedAt`.

Impact: Prisma expects an `updatedAt` column that the DB likely doesn't have. Prisma Client will report schema drift and migrations will be required.

Resolution options:

- Add `updatedAt TIMESTAMP` to the DB by creating a migration (recommended if you need `@updatedAt` behavior).
- Alternatively, remove `updatedAt` from `schema.prisma` if it's not required.

### 3) DiscordActivityType enum

- Migrations show an enum created (`'CUSTOM','LISTENING','WATCHING','PLAYING'`) then replaced with `('Custom','Listening','Streaming','Playing')` by a migration that renames and migrates the enum values.
- `schema.prisma` enum `DiscordActivityType { Custom Listening Streaming Playing }` matches the final state.

### 4) Guild.motivationChannelId

- Migration dropped `motivationChannel` and added `motivationChannelId` (with a warning about data loss).
- `schema.prisma` uses `motivationChannelId String?` — matches final migration.

## Comparison table

| Model / Item               | Migrations (DB)                                                                                                                                                         | `schema.prisma`                                                                                                                                |   Status | Notes                                                                                                                                                                                      |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Guild                      | `id` PK, `guildId` UNIQUE, `motivationChannelId` TEXT NULL, `joinedAt` TIMESTAMP DEFAULT now(), `updatedAt` TIMESTAMP @updatedAt equivalent                             | `id String @id`, `guildId String @unique`, `motivationChannelId String?`, `joinedAt DateTime @default(now())`, `updatedAt DateTime @updatedAt` |    Match | Migration renamed/dropped old `motivationChannel` and added `motivationChannelId` (warning: data loss in migration).                                                                       |
| MotivationQuote            | `id`, `quote`, `author`, `addedBy`, `createdAt` TIMESTAMP DEFAULT now()                                                                                                 | same fields                                                                                                                                    |    Match | No differences observed.                                                                                                                                                                   |
| SuggestionQuote            | `id`, `quote`, `author`, `addedBy`, `status` TEXT DEFAULT 'pending', `guildId` TEXT (column exists; FK dropped by later migration), `createdAt` TIMESTAMP DEFAULT now() | `id`, `quote`, `author`, `addedBy`, `status String @default("pending")`, `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt` | Mismatch | DB still contains `guildId` column (FK removed). `updatedAt` exists in schema but not in migrations/DB. Decide whether to remove column (create migration) or add relation back to schema. |
| DiscordActivity            | `id`, `activity`, `type` enum, `url`, `createdAt` TIMESTAMP DEFAULT now()                                                                                               | `id`, `activity`, `type DiscordActivityType @default(Custom)`, `url`, `createdAt DateTime @default(now())`                                     |    Match | Table created in migrations and matches schema.                                                                                                                                            |
| DiscordActivityType (enum) | Final migration replaced values to `('Custom','Listening','Streaming','Playing')`                                                                                       | `enum DiscordActivityType { Custom Listening Streaming Playing }`                                                                              |    Match | Enum values aligned by migration that replaced the enum; schema matches final state.                                                                                                       |

## Notes / suggested quick actions

- To align DB → Prisma: run `npx prisma db pull` (introspects DB and updates `schema.prisma`). Commit first—this may overwrite manual changes.
- To align Prisma → DB: create migrations with `npx prisma migrate dev --name <desc>` (for example `drop-suggestion-guildId` or `add-suggestion-updatedAt`).
- Specific quick choice: if you want the DB to remove `SuggestionQuote.guildId`, I can create a migration SQL file that drops that column (and optionally the now-unused FK if present). If you instead want to restore the relation in Prisma, I can add the relation back into `schema.prisma`.

## Recommended commands

Use these to inspect the live DB and then either pull or create migrations.

1. Inspect `SuggestionQuote` columns (psql):

```bash
psql "$DATABASE_URL" -c '\d+ "SuggestionQuote"'
```

2. To pull current DB schema into `schema.prisma` (overwrites schema):

```bash
npx prisma db pull
```

3. To create a migration that drops `guildId` from `SuggestionQuote` (if you intend to remove it):

```bash
npx prisma migrate dev --name drop-suggestion-guildId
```

4. To add `updatedAt` to `SuggestionQuote` in the DB (keep the field in Prisma):

```bash
# first ensure schema.prisma has the field, then run
npx prisma migrate dev --name add-suggestion-updatedAt
```

Notes:

- `npx prisma db pull` is useful if you want to align `schema.prisma` to the DB state. It may overwrite manual edits; commit before running.
- Creating a migration with `prisma migrate dev` will attempt to apply changes to your development database. Be sure to point `DATABASE_URL` at a dev DB.

## Requirements coverage

- Compare schema to migrations: Done.
- Report mismatches and next steps: Done.

## Next steps I can take for you

- Create the migration SQL to drop `SuggestionQuote.guildId`.
- Create the migration to add `SuggestionQuote.updatedAt`.
- Run `npx prisma db pull` and produce a diff of the resulting schema.

Tell me which of the above you want me to do and I'll create the migration file(s) or run the introspection.
