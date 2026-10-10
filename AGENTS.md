# AGENTS.md

This file provides repository guidance to coding agents working with this codebase.

## Project Overview

FluffBoost is a Discord bot (Discord.js v14) that delivers daily motivational quotes and manages bot status activities. It runs as a sharded bot process with an Express health-check API, PostgreSQL database (via Drizzle ORM), and BullMQ background jobs backed by Redis.

## Monorepo layout

This is a **Bun-workspace + Turborepo monorepo**. Run all commands from the repository root.

- `apps/discord/` — the Discord bot. **Every `src/…`, `tests/…`, and `drizzle/…` path in this document lives under `apps/discord/`** (e.g. `src/app.ts` → `apps/discord/src/app.ts`). The bot package is `@fluffboost/discord`.
- `apps/docs/` — the marketing site + docs (Next.js 16 + Fumadocs, static export → GitHub Pages), **live at https://mrdemonwolf.github.io/fluffboost/**. Docs are split into `content/user/` (Guide, for server owners) and `content/developer/`. Package `@fluffboost/docs`.
- `apps/motion/` — Remotion source for the animated brand banners and icons (`@fluffboost/motion`). Renders into `assets/brand/animated/` (committed, checksummed); backplates live in `assets/brand/motion-sources/`. See `apps/motion/README.md`.
- `apps/web/` — **reserved** for a future web dashboard (not created yet). Add a `@fluffboost/web` package here when it's built.
- `docs/` (repo root) — marketing copy and the artwork brief, not published.
- Root `package.json` is the private workspace root; `turbo.json` defines the pipeline. Security `overrides` pins live at the root.

## Commands

```bash
# Development (run from the repo root)
bun run dev:discord       # Bot with --watch (hot reload)
bun run dev:docs          # Marketing/docs site
bun run dev:motion        # Remotion Studio for the brand animations
# (plain `bun run dev` starts all three workspaces at once)

# Brand animations (apps/motion)
bun run brand:render      # Render PNG/MP4/GIF exports into assets/brand/animated
bun run brand:verify      # Verify committed exports (needs ffmpeg + ffprobe; runs in CI)

# Build
bun run build             # turbo build (the docs static export)

# Linting & formatting (turbo, workspace-wide)
bun run lint              # ESLint with auto-fix
bun run lint:check        # ESLint check only (used in CI)
bun run format            # Prettier formatting

# Database (delegate to apps/discord)
bun run db:generate       # Generate a new Drizzle migration (db:* run drizzle-kit via `bun --bun`)
bun run db:push           # Push schema changes to database (dev)
bun run db:migrate        # Run migrations (production)
bun run db:studio         # Open Drizzle Studio UI
bun run db:seed           # Load the starter quote library (idempotent)
bun run db:reconcile --confirm  # Legacy (Prisma-era/drifted) DB -> current schema + baseline, one transaction

# Type checking & tests (turbo, workspace-wide)
bun run typecheck         # tsc --noEmit
bun run test              # Bot unit tests (NODE_ENV=test, preloads tests/preload.ts; excludes motion)
bun run test:coverage     # Same, with a coverage report (what CI runs)
bun run test:e2e          # Bot E2E (real PostgreSQL) + docs browser E2E (Playwright)

# Infrastructure
docker compose up -d      # Start PostgreSQL 18 + Redis 8 locally (bot container: --profile bot)

# Scope to one package directly, e.g.:
bun --filter @fluffboost/discord test
```

Do not run a bare `bun test` from the repo root: Bun's runner then also picks up
`apps/discord/e2e/` (needs `E2E_DATABASE_URL`) and the Playwright specs in
`apps/docs/e2e/`, and skips the `tests/preload.ts` env fixture. Use the scripts
above.

**After changing `src/database/schema.ts`**, run `bun run db:push` (dev) to sync changes, or `bun run db:generate` then `bun run db:migrate` (prod) to create and apply a migration. Commit the generated SQL and `drizzle/meta/`; CI fails if `drizzle-kit generate` would produce a new migration. Never edit a committed migration (the production baseline row stores `0000`'s SHA-256). No code generation step is needed — Drizzle reads the schema at runtime.

## Architecture

### Entry Points & Process Model

The app uses **Discord.js ShardingManager**. `src/app.ts` is the main process; it only wires real dependencies into `runApp()` in `src/appCore.ts` (injectable, so `tests/app.test.ts` needs no `mock.module`). It verifies DB/Redis connectivity (`SELECT 1` + `PING` once the Redis client is ready, about 45s of capped backoff, then exit 1), checks that `public."Guild"` exists (exit 1 with "Database schema missing" otherwise, e.g. `SKIP_MIGRATIONS=true` on an empty DB), starts the Express API server, resolves the recommended shard count (retrying network errors, 5xx and 429; an invalid token or exhausted retries exits 1 after 15s), then spawns shard processes that each run `src/bot.ts`. Bun runs TypeScript directly, so the ShardingManager always points to `./src/bot.ts` with no special loader flags. The manager logs shard `error`/`death` and exits non-zero after 5 deaths of one shard within 15 minutes, so the orchestrator's restart backoff applies; its teardown (`stopAllShards`) re-reads the shard list so a replacement discord.js forks mid-shutdown is stopped too, and a shard whose IPC channel to the manager closes shuts itself down. The lifecycle helpers and shutdown timing budget live in `src/utils/shardShutdown.ts`; generic `sleep`/`withTimeout`/`retryWithBackoff` live in `src/utils/async.ts`.

Each shard (`src/bot.ts`) creates a Discord client, registers event listeners, initializes a BullMQ queue + worker, and logs into Discord. Startup steps in `ready.ts` are best-effort (logged, never fatal); command registration on shard 0 retries with backoff. Unrecoverable errors go through `fatal()`, which tears down at once but exits only after 15s so respawns cannot hot-loop Discord logins.

### Key Directories

- `src/commands/` — Slash commands. Each file exports `slashCommand` (SlashCommandBuilder), `execute(client, interaction)` and `export default { slashCommand, execute }` (the registry uses the default export). Subcommand groups live in subdirectories (`admin/`, `owner/`, `setup/`).
- `src/events/` — Discord event handlers. `interactionCreate.ts` narrows with `isChatInputCommand()` once and routes through the `commandRegistry` map in `commandRegistry.ts`; unknown commands get an ephemeral "no longer available" reply.
- `src/worker/` — BullMQ worker setup and job handlers (`jobs/setActivity.ts`, `jobs/sendMotivation.ts`). Jobs are dispatched on repeating schedules.
- `src/database/index.ts` — Drizzle ORM instance using the `postgres` driver. Pool options live in `clientOptions.ts` (`application_name`, 15s `statement_timeout`, 30s `idle_in_transaction_session_timeout`); `migrate.ts` uses its own connection without them.
- `src/database/schema.ts` — Drizzle schema definitions (tables, enums, types). This is the source of truth for the database schema.
- `src/utils/envSchema.ts` — Zod schema for every environment variable. `src/utils/env.ts` parses it at startup and exits immediately on invalid config.
- `src/utils/logger.ts` — Structured consola-based logger with context-specific sub-loggers (`logger.commands.*`, `logger.database.*`, `logger.api.*`, `logger.discord.*`).
- `scripts/` — One-off maintenance scripts, run via workspace commands rather than by path (e.g. `scripts/seedQuotes.ts` → `bun run db:seed`). Covered by `tsconfig.json`'s `include`, so they typecheck and lint in CI.

### Command Pattern

To add a new slash command:
1. Create a file in `src/commands/` exporting `slashCommand`, `execute` and `export default { slashCommand, execute }`.
2. Add the module's default export to the `commands` list in `src/events/commandRegistry.ts`. Routing (`commandRegistry`) and Discord registration (`slashCommands`, registered by `ready.ts`) are both derived from that one list; handlers receive a `ChatInputCommandInteraction` because `interactionCreate` narrows once.
3. For a subcommand of a group router (`admin/`, `owner/`, `setup/`), add an entry to that router's exported route Map (`adminRoutes` / `ownerRoutes` / `setupRoutes`) instead.
4. Update the static text in `src/commands/help.ts`, the command tables in `README.md` and `apps/docs/content/user/commands.mdx`.

Each subcommand wraps itself in `withCommandLogging`; routers do not. Server-only commands call `.setContexts(InteractionContextType.Guild)` (`/setup`, `/premium`, `/suggestion`).

### Background Jobs

BullMQ processes two recurring jobs:
- `set-activity` — Rotates bot presence every N minutes (configurable via `DISCORD_ACTIVITY_INTERVAL_MINUTES`).
- `send-motivation` — Runs every minute to evaluate per-guild schedules. Each guild has its own `motivationFrequency` (Daily/Weekly/Monthly), `motivationTime` (HH:mm), `timezone`, and `motivationDay`. The worker resolves each guild's due occurrence with `createDueOccurrenceResolver()` from `src/utils/scheduleEvaluator.ts` (dayjs with timezone support; it combines `mostRecentScheduledOccurrence()` and `isDueForOccurrence()`, caches the occurrence per distinct schedule per tick, and applies a 6-hour catch-up window), then sends only to those guilds. A malformed schedule row is logged and skipped. Uses `client.channels.fetch()` (not `.cache.get()`) and `Promise.allSettled()` with per-guild error handling. Due guilds are sent in chunks of 25; each guild is **claimed** by an atomic `UPDATE` of `lastMotivationSentAt` just **before** its send. Permanent 4xx errors keep the claim; 5xx, network errors, 429 and 401 release it so a later tick in the catch-up window retries (a 401 also stops further chunks). Sends carry a deterministic `nonce` with `enforceNonce: true`, so a retry within Discord's dedupe window cannot double-post. Delivery is at most once per occurrence: a crash between claim and send drops that occurrence for that guild (chunking bounds the loss). Never move the claim after `send()` — that reintroduces the concurrent double-delivery race the claim prevents. The processor passes BullMQ's abort signal through, so delivery stops claiming between chunks on shutdown or when the job's deadline (10 min; set-activity 60s) expires.

Worker log component names use `"Worker"` consistently.

### Database Models

Four Drizzle tables defined in `src/database/schema.ts` (Drizzle identifier → SQL table): `guilds` → `"Guild"` (server config with per-guild motivation schedule including frequency, time, timezone, day, `isPremium` and `lastMotivationSentAt`), `motivationQuotes` → `"MotivationQuote"`, `suggestionQuotes` → `"SuggestionQuote"` (every user submission with its review `status`, `reviewedBy` and `reviewedAt`), `discordActivities` → `"DiscordActivity"` (bot status entries with type enum). Use the quoted SQL names in raw SQL. Three pgEnums: `motivationFrequencyEnum` (Daily/Weekly/Monthly), `discordActivityTypeEnum` (Custom/Listening/Streaming/Playing) and `suggestionStatusEnum` (Pending/Approved/Rejected). Types are exported as `Guild`, `MotivationQuote`, `SuggestionQuote`, `DiscordActivity`, `MotivationFrequency`, `DiscordActivityType`, `SuggestionStatus`.

### Discord.js Patterns

- **Always use `client.channels.fetch(id)`** instead of `client.channels.cache.get(id)`. After restarts or with sharding, most channels aren't in cache and `.cache.get()` returns `undefined`.
- **Channel type guards** — Before sending to a channel, check `channel.isTextBased() && !channel.isDMBased()`. See `src/utils/mainChannel.ts` (and `src/worker/jobs/sendMotivationCore.ts`) for the pattern. A channel that may live on another shard is fetched with `{ allowUnknownGuild: true }`.
- **Discord.js handles rate limiting internally** — Its REST client respects `X-RateLimit-*` headers and queues requests automatically. No manual staggering is needed.
- **Batch operations across guilds** — Use `Promise.allSettled()` so one guild's failure doesn't block others. Always `await` `.send()` calls.

## Code Conventions

- **ESM modules** — The project uses `"type": "module"`. All local imports must use `.js` extensions (e.g., `import env from "./utils/env.js"`), even for TypeScript source files.
- **Path aliases** — `@/*`, `@commands/*`, `@events/*`, `@utils/*`, `@database/*`, `@api/*` are configured in `tsconfig.json` but local imports currently use relative paths.
- **Strict TypeScript** — `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noUncheckedIndexedAccess` are all enabled.
- **Logging** — Use `logger` from `src/utils/logger.ts` (never raw `console.log`). Use the appropriate sub-logger for context.
- **Max line length** — 120 characters (ESLint enforced).
- **Runtime & Package manager** — Bun (do not use npm, yarn, or pnpm).

## Environment Variables

All env vars are validated by Zod (schema in `src/utils/envSchema.ts`, loaded by `src/utils/env.ts`; Bun loads `.env` itself, so there is no dotenv). Required: `DATABASE_URL`, `REDIS_URL`, `DISCORD_APPLICATION_BOT_TOKEN`, `OWNER_ID`, `MAIN_CHANNEL_ID`. `DISCORD_APPLICATION_ID`, `DISCORD_APPLICATION_PUBLIC_KEY` and `MAIN_GUILD_ID` are optional and unused (validated only when set). `DISCORD_PREMIUM_SKU_ID` is required only when `PREMIUM_ENABLED=true`; an empty value counts as unset. `PORT` is a number 1-65535 (default 3000); an unset `HOST` binds all interfaces. `VERSION` defaults to the `apps/discord/package.json` version. `DATABASE_QUERY_LOG` (default false) logs query text without parameters at debug level; SQL is not logged by default, even in development. See `.env.example` for the full list.

- `PREMIUM_ENABLED=false` (the default) turns Premium **gating off**, not custom schedules: `/setup schedule` is open to every server, saved custom schedules apply, and there is no purchase UI or entitlement handling. Set `true` (with the SKU) to restrict custom schedules to subscribed servers.
- An empty `ALLOWED_USERS` disables every `/admin` command.
- `DATABASE_POOL_MAX` is per process. The manager plus every shard has its own pool, so keep `shards × DATABASE_POOL_MAX + ~2 ≤ max_connections − reserved`; lower it (or add PgBouncer) as the shard count grows.
- `SKIP_MIGRATIONS` is read only by `docker-entrypoint.sh`, not the Zod schema.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR to `main` and `dev`, using Bun from `packageManager` via `oven-sh/setup-bun@v2`. Jobs:

- **Test & Typecheck** — `bun run test:coverage`, a schema drift check (`drizzle-kit generate` must produce no new migration), `bun run lint:check`, `bun run brand:verify` (installs ffmpeg), `bun run typecheck`, and a coverage artifact upload.
- **Security Audit** — `bun audit` (plus a non-blocking `bun outdated`).
- **Bot E2E (PostgreSQL)** — `test:e2e` for `@fluffboost/discord` against a `postgres:18-alpine` service.
- **Docs Build & Browser E2E** — contrast check, then Playwright against the `/fluffboost` static export.
- **Docker Build Test** — builds `apps/discord/Dockerfile` from the repo root and runs the image's `migrate.ts` twice against Postgres (the second run must be a no-op).

The docs site deploys separately from `.github/workflows/deploy-docs.yml` on pushes to `main`.

## Docker / Deployment

The bot is deployed via **Dokploy** as a Docker image. Since Bun runs TypeScript directly, there is no build step. Migrations run at container startup via `docker-entrypoint.sh`.

**Dokploy settings:** build context / base directory = the **repository root** (`.`); Dockerfile path = **`apps/discord/Dockerfile`**. The context must be the root because the Bun workspace lockfile is there and `turbo prune` needs the whole graph. See `apps/docs/content/developer/deployment.mdx` (published at https://mrdemonwolf.github.io/fluffboost/developers/deployment/) for both a fresh Dokploy setup and migrating an existing (pre-monorepo) deployment — the latter changes the Dockerfile path plus the health check path, stop grace period and update order below.

### Key files

- `apps/discord/Dockerfile` — Multi-stage build: base → **pruner** (`turbo prune @fluffboost/discord --docker`, so the image excludes `apps/docs`) → installer (frozen prod install) → slim runtime. Runtime `WORKDIR` is `apps/discord`, so the entrypoint's relative paths resolve unchanged.
- `apps/discord/docker-entrypoint.sh` — Runs `bun run src/database/migrate.ts` (programmatic Drizzle migration, no `drizzle-kit` needed) then starts the app with `bun run src/app.ts`. Set `SKIP_MIGRATIONS=true` to skip.
- `.dockerignore` (repo root) — build context is the root, so this is the one that applies.
- The `HEALTHCHECK` uses `GET /api/health/live` (liveness, no dependencies); `GET /api/health` is readiness (503 when Postgres/Redis are down) for external monitors. Compose and Dokploy use a 35s stop grace period (shard watchdog 20s < SIGKILL 22s < parent 30s < grace 35s; in Dokploy's Swarm settings that is `35000000000` ns). Five deaths of one shard within 15 minutes exit the container non-zero.
- **Update order must be stop-first.** Dokploy's Swarm default is start-first, which runs two bot instances on the same token during a deploy (duplicate command handling, two schedulers). Set Update Config and Rollback Config to `{"Parallelism":1,"Order":"stop-first","FailureAction":"rollback"}`. There are no down migrations and a rollback runs the old image against the already-migrated schema, so keep migrations backward-compatible (expand/contract) and take a `pg_dump` before risky ones.

**Migrations:** the entrypoint runs `migrate.ts` before the app starts, so deploys apply pending migrations automatically (`SKIP_MIGRATIONS=true` opts out). The repo ships both the SQL and `drizzle/meta/_journal.json` — `migrate.ts` exits 1 when that journal is missing, and refuses a database that has the tables but no migration history (see "Baseline an existing database" in `apps/docs/content/developer/deployment.mdx`). Prisma-era or drifted databases (including `SuggestionQuote.guildId` from early Prisma, which is dropped) go through `scripts/reconcileLegacySchema.sql` via `bun run db:reconcile --confirm` after a `pg_dump --format=custom` with the bot stopped: one transaction that refuses existing migration history, renames the legacy objects, runs `0000` verbatim, copies rows with value mapping (unknown enum values such as `WATCHING` abort), checks row counts and records the baseline row. `tests/scripts/reconcileLegacySchema.test.ts` keeps its embedded `0000` and hash in sync with the committed migration. DDL runs with a 60s `lock_timeout`, and the migrator polls the advisory lock (logging the holder's pid) and aborts after 2 minutes. Use `db:push` for local dev only: it mutates the schema without recording migration history, so mixing it into production can make a later `db:migrate` fail or drift.

### The website (apps/docs)

Live at **https://mrdemonwolf.github.io/fluffboost/**. Static Next.js + Fumadocs, deployed to GitHub Pages by `.github/workflows/deploy-docs.yml` (`bun run --filter=@fluffboost/docs build` with `NEXT_PUBLIC_BASE_PATH=/fluffboost`). Independent of the bot deployment. Build with webpack (`next build --webpack`) — fumadocs-mdx's generated `.source` doesn't transform under Turbopack here. The `.source` dir and `next-env.d.ts` are generated (gitignored).

## Git Branching

- `main` — Production branch
- `dev` — Development integration branch
- Feature branches follow pattern `FLUFF-{number}-description`

## Premium / Subscription Support

Premium subscriptions use Discord's App Subscriptions (SKUs, Entitlements). Managed in `src/utils/premium.ts` with `/premium` command in `src/commands/premium.ts`.

### Environment Variables

- `PREMIUM_ENABLED` — Master toggle for Premium gating (default: `false`). When `false`, custom schedules are open to every server and no entitlement handlers run; it does not hide custom scheduling.
- `DISCORD_PREMIUM_SKU_ID` — SKU ID from Discord Developer Portal (required when `PREMIUM_ENABLED=true`)

### Testing Premium with Test Entitlements

Discord provides test entitlements so you can verify your subscription flow without real payments. This uses Discord's official testing mechanism via the API.

**Setup:**
1. Create a subscription SKU in the [Discord Developer Portal](https://discord.com/developers/applications) under your app's Monetization settings
2. Set `PREMIUM_ENABLED=true` and `DISCORD_PREMIUM_SKU_ID=<your_sku_id>` in your `.env`
3. Run `bun run dev:discord`

**Testing the upsell flow (no entitlement):**
- Use `/premium` — you'll see the premium info embed with a purchase button

**Testing the subscribed flow (with test entitlement):**
- Use `/owner premium test-create` to grant the current server a test entitlement (optionally pass `guild:` to target another server)
- Use `/premium` again — you'll now see the "Premium Active" embed
- Use `/owner premium test-delete entitlement_id:<id>` to remove the test entitlement when done

**Owner commands for test entitlements:**
- `/owner premium test-create [guild]` — Creates a guild-level test entitlement via `client.application.entitlements.createTest()`. Defaults to the current server. Returns the entitlement ID.
- `/owner premium test-delete <entitlement_id>` — Deletes a test entitlement via `client.application.entitlements.deleteTest()`.

These commands are restricted to the bot owner only (`OWNER_ID` env var) and are
available only outside production. Set `NODE_ENV=production` for the live bot:
global command registration omits the owner test group, handlers reject test
operations, and Premium access ignores test entitlements. Startup bulk command
registration removes legacy global owner commands; guild-scoped legacy commands
require separate scoped cleanup. Removing commands does not remove existing test
entitlements. See `apps/docs/content/developer/premium.mdx` for operator setup.

### Custom Quote Timing (Premium)

Premium guilds can customize their quote delivery schedule via `/setup schedule`:
- **Frequency**: Daily (default), Weekly, or Monthly
- **Time**: HH:mm format (default: `08:00`)
- **Timezone**: Any IANA timezone with autocomplete (default: `America/Chicago`)
- **Day**: Day of week (0-6) for weekly, day of month (1-28) for monthly

Non-premium guilds use the default daily 8:00 AM America/Chicago schedule when
Premium is enabled. The schedule evaluator (`src/utils/scheduleEvaluator.ts`)
uses dayjs with timezone support to determine when each guild is due. When an
entitlement expires, custom settings are retained but background delivery uses
the free default until Premium is active again. Cancellation of renewal alone
does not revoke the still-active billing period. Entitlements must match the
configured SKU, current guild, active dates, and production test policy. In
production both owner test entitlements and Application Test Mode purchases
(`TestModePurchase`) are ignored. Each shard re-checks its guilds' entitlements
every 30 minutes (`startPremiumReconciliationLoop`) and after a re-identified
session, so delivery falls back to the free schedule within about 30 minutes
after a term ends.

### Gating Future Commands Behind Premium

```typescript
import { hasEntitlement, isPremiumEnabled } from "../utils/premium.js";

// In any command execute function:
if (isPremiumEnabled() && !hasEntitlement(interaction)) {
  // Show premium upsell
  return;
}
```

## Testing

Tests use **bun:test** + **Sinon**, configured in `apps/discord/bunfig.toml`. Unit tests live in `apps/discord/tests/`, mirror `src/` (e.g. `src/commands/owner/premium/testDelete.ts` → `tests/commands/owner/premium/testDelete.test.ts`) and use the `.test.ts` suffix. Time-dependent tests use `sinon.useFakeTimers()` to control `dayjs()`.

- **Run through the scripts** — `bun run test` / `bun run test:coverage` from the root (or `bun --filter @fluffboost/discord test`). They set `NODE_ENV=test`, run with `--isolate` and preload `tests/preload.ts`, which mocks `src/utils/env.js` with `UNIT_ENV_FIXTURE` from `tests/helpers.ts` so no `.env` is needed. Targeted run: `cd apps/discord && NODE_ENV=test bun test --isolate --preload ./tests/preload.ts tests/<path>`.
- **`mock.module()` is scoped to one test file** because the scripts pass `--isolate` (each file gets a fresh module registry and the preload fixture). Do not add hooks that "restore" another file's mocks. Within a file a mock persists across its tests and replaces the whole module, so:
  1. Prefer injecting stubs into a `*Core.ts` module (`sendMotivationCore.ts`, `setActivityCore.ts`, `premiumReconciliationCore.ts`), which takes its dependencies as arguments.
  2. When you mock a shared module, spread the real exports and replace only what you need (see `tests/commands/permissionsMock.ts`, which copies the real exports before registering the mock). A partial mock makes other imports in that file fail with "Export named X not found".
  3. To re-evaluate a module under different mocks in the same file, import it with a query suffix (e.g. `import("../../src/events/commandRegistry.js?env=production")`).
  Without `--isolate` (a bare `bun test`), mocks leak across files and about 20 tests fail; always use the scripts.
- **Shared fakes** — `tests/helpers.ts` has the factories (`mockLogger`, `mockDb`, `mockDbChain`, `mockInteraction`, `mockClient`, `mockGuild`, `mockEntitlement`, `mockEnv`, `stubBuildPremiumUpsell`). Keep new one-off helpers local to the test file.
- **Router/registry tests** swap entries in the exported route Maps (`adminRoutes`, `ownerRoutes`, `setupRoutes`) rather than mocking subcommand modules; `tests/events/commandRegistry.test.ts` checks which commands exist for each `NODE_ENV`.
- **Bot E2E** lives in `apps/discord/e2e/` and runs with `bun run --filter=@fluffboost/discord test:e2e` against real PostgreSQL. It needs `E2E_DATABASE_URL` (loopback host, database named `fluffboost_e2e`) and `E2E_DATABASE_DISPOSABLE=true`, never falls back to `DATABASE_URL`, and does not use the unit preload. See `apps/docs/content/developer/testing.mdx`.
- **Docs browser E2E** is Playwright in `apps/docs/e2e/` (`bun run --filter=@fluffboost/docs test:e2e`).

## Setup Notes

If `node_modules` is missing, run `bun install` before type-checking. No code generation step is needed — Drizzle has no codegen.
