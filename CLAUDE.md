# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FluffBoost is a Discord bot (Discord.js v14) that delivers daily motivational quotes and manages bot status activities. It runs as a sharded bot process with an Express health-check API, PostgreSQL database (via Drizzle ORM), and BullMQ background jobs backed by Redis.

## Monorepo layout

This is a **Bun-workspace + Turborepo monorepo**. Run all commands from the repository root.

- `apps/discord/` — the Discord bot. **Every `src/…`, `tests/…`, and `drizzle/…` path in this document lives under `apps/discord/`** (e.g. `src/app.ts` → `apps/discord/src/app.ts`). The bot package is `@fluffboost/discord`.
- `apps/docs/` — the marketing site + docs (Next.js 16 + Fumadocs, static export → GitHub Pages), **live at https://mrdemonwolf.github.io/fluffboost/**. Docs are split into `content/user/` (Guide, for server owners) and `content/developer/`. Package `@fluffboost/docs`.
- `apps/web/` — **reserved** for a future web dashboard (not created yet). Add a `@fluffboost/web` package here when it's built.
- Root `package.json` is the private workspace root; `turbo.json` defines the pipeline. Security `overrides` pins live at the root.

## Commands

```bash
# Development (run from the repo root)
bun run dev:discord       # Bot with --watch (hot reload)
bun run dev:docs          # Marketing/docs site

# Linting & formatting (turbo, workspace-wide)
bun run lint              # ESLint with auto-fix
bun run lint:check        # ESLint check only (used in CI)
bun run format            # Prettier formatting

# Database (delegate to apps/discord)
bun run db:generate       # Generate a new Drizzle migration
bun run db:push           # Push schema changes to database (dev)
bun run db:migrate        # Run migrations (production)
bun run db:studio         # Open Drizzle Studio UI
bun run db:seed           # Load the starter quote library (idempotent)

# Type checking & tests (turbo, workspace-wide)
bun run typecheck         # tsc --noEmit
bun run test              # bun:test runner (NODE_ENV=test)
bun run test:coverage     # Tests with coverage report

# Infrastructure
docker compose up         # Start PostgreSQL 16 + Redis 7 locally

# Scope to one package directly, e.g.:
bun --filter @fluffboost/discord test
```

**After changing `src/database/schema.ts`**, run `bun run db:push` (dev) to sync changes, or `bun run db:generate` then `bun run db:migrate` (prod) to create and apply a migration. No code generation step is needed — Drizzle reads the schema at runtime.

## Architecture

### Entry Points & Process Model

The app uses **Discord.js ShardingManager**. `src/app.ts` is the main process — it verifies DB/Redis connectivity, starts the Express API server, then spawns shard processes that each run `src/bot.ts`. Bun runs TypeScript directly, so the ShardingManager always points to `./src/bot.ts` with no special loader flags.

Each shard (`src/bot.ts`) creates a Discord client, registers event listeners, initializes a BullMQ queue + worker, and logs into Discord.

### Key Directories

- `src/commands/` — Slash commands. Each file exports `slashCommand` (SlashCommandBuilder) and `execute(client, interaction)`. Subcommand groups live in subdirectories (`admin/`, `setup/`).
- `src/events/` — Discord event handlers. Command routing happens in `interactionCreate.ts` via a switch on `commandName`.
- `src/worker/` — BullMQ worker setup and job handlers (`jobs/setActivity.ts`, `jobs/sendMotivation.ts`). Jobs are dispatched on repeating schedules.
- `src/database/index.ts` — Drizzle ORM instance using `postgres` driver with global caching pattern.
- `src/database/schema.ts` — Drizzle schema definitions (tables, enums, types). This is the source of truth for the database schema.
- `src/utils/env.ts` — Zod schema validating all environment variables at startup. The process exits immediately on invalid config.
- `src/utils/logger.ts` — Structured consola-based logger with context-specific sub-loggers (`logger.commands.*`, `logger.database.*`, `logger.api.*`, `logger.discord.*`).
- `scripts/` — One-off maintenance scripts, run via workspace commands rather than by path (e.g. `scripts/seedQuotes.ts` → `bun run db:seed`). Covered by `tsconfig.json`'s `include`, so they typecheck and lint in CI.

### Command Pattern

To add a new slash command:
1. Create a file in `src/commands/` exporting `slashCommand` and `execute`.
2. Import it in `src/events/interactionCreate.ts` and add a case to the switch.
3. Register it in `src/events/ready.ts` where commands are pushed to Discord's API.

### Background Jobs

BullMQ processes two recurring jobs:
- `set-activity` — Rotates bot presence every N minutes (configurable via `DISCORD_ACTIVITY_INTERVAL_MINUTES`).
- `send-motivation` — Runs every minute to evaluate per-guild schedules. Each guild has its own `motivationFrequency` (Daily/Weekly/Monthly), `motivationTime` (HH:mm), `timezone`, and `motivationDay`. The worker uses `isGuildDueForMotivation()` from `src/utils/scheduleEvaluator.ts` (powered by dayjs with timezone support) to determine which guilds are due, then sends only to those guilds. Uses `client.channels.fetch()` (not `.cache.get()`) and `Promise.allSettled()` with per-guild error handling. After each successful send, `lastMotivationSentAt` is updated to prevent duplicate deliveries.

Worker log component names use `"Worker"` consistently.

### Database Models

Four Drizzle tables defined in `src/database/schema.ts`: `guilds` (server config with per-guild motivation schedule including frequency, time, timezone, day, and `lastMotivationSentAt`), `motivationQuotes`, `suggestionQuotes` (user-submitted, pending approval), `discordActivities` (bot status entries with type enum). Two pgEnums: `motivationFrequencyEnum` (Daily/Weekly/Monthly) and `discordActivityTypeEnum` (Custom/Listening/Streaming/Playing). Types are exported as `Guild`, `MotivationQuote`, `SuggestionQuote`, `DiscordActivity`, `MotivationFrequency`, `DiscordActivityType`.

### Discord.js Patterns

- **Always use `client.channels.fetch(id)`** instead of `client.channels.cache.get(id)`. After restarts or with sharding, most channels aren't in cache and `.cache.get()` returns `undefined`.
- **Channel type guards** — Before sending to a channel, check `channel.isTextBased() && !channel.isDMBased()`. See `src/commands/admin/quote/create.ts` for the pattern.
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

All env vars are validated by Zod in `src/utils/env.ts`. Required variables include: `DATABASE_URL`, `REDIS_URL`, `DISCORD_APPLICATION_ID`, `DISCORD_APPLICATION_PUBLIC_KEY`, `DISCORD_APPLICATION_BOT_TOKEN`, `OWNER_ID`, `MAIN_GUILD_ID`, `MAIN_CHANNEL_ID`. See `.env.example` for the full list.

## CI

GitHub Actions runs on push/PR to `main` and `dev`: test execution with Bun's built-in coverage, ESLint check, TypeScript type check, security audit, and Docker build test. Uses Bun via `oven-sh/setup-bun@v2`. Coverage reports are uploaded as artifacts.

## Docker / Deployment

The bot is deployed via **Dokploy** as a Docker image. Since Bun runs TypeScript directly, there is no build step. Migrations run at container startup via `docker-entrypoint.sh`.

**Dokploy settings:** build context / base directory = the **repository root** (`.`); Dockerfile path = **`apps/discord/Dockerfile`**. The context must be the root because the Bun workspace lockfile is there and `turbo prune` needs the whole graph. See `apps/docs/content/developer/deployment.mdx` (published at https://mrdemonwolf.github.io/fluffboost/developers/deployment/) for both a fresh Dokploy setup and migrating an existing (pre-monorepo) deployment — the latter is a one-field change.

### Key files

- `apps/discord/Dockerfile` — Multi-stage build: base → **pruner** (`turbo prune @fluffboost/discord --docker`, so the image excludes `apps/docs`) → installer (frozen prod install) → slim runtime. Runtime `WORKDIR` is `apps/discord`, so the entrypoint's relative paths resolve unchanged.
- `apps/discord/docker-entrypoint.sh` — Runs `bun run src/database/migrate.ts` (programmatic Drizzle migration, no `drizzle-kit` needed) then starts the app with `bun run src/app.ts`. Set `SKIP_MIGRATIONS=true` to skip.
- `.dockerignore` (repo root) — build context is the root, so this is the one that applies.

**Migrations caveat:** `migrate.ts` skips when `drizzle/meta/_journal.json` is absent; the repo ships the SQL without that journal, so startup migrations are currently a no-op and the schema is managed via `db:push`. Don't "fix" this against prod without generating the journal and testing on a DB copy first.

### The website (apps/docs)

Live at **https://mrdemonwolf.github.io/fluffboost/**. Static Next.js + Fumadocs, deployed to GitHub Pages by `.github/workflows/deploy-docs.yml` (`bun run --filter=@fluffboost/docs build` with `NEXT_PUBLIC_BASE_PATH=/fluffboost`). Independent of the bot deployment. Build with webpack (`next build --webpack`) — fumadocs-mdx's generated `.source` doesn't transform under Turbopack here. The `.source` dir and `next-env.d.ts` are generated (gitignored).

## Git Branching

- `main` — Production branch
- `dev` — Development integration branch
- Feature branches follow pattern `FLUFF-{number}-description`

## Premium / Subscription Support

Premium subscriptions use Discord's App Subscriptions (SKUs, Entitlements). Managed in `src/utils/premium.ts` with `/premium` command in `src/commands/premium.ts`.

### Environment Variables

- `PREMIUM_ENABLED` — Master toggle for premium features (default: `false`)
- `DISCORD_PREMIUM_SKU_ID` — SKU ID from Discord Developer Portal (required when `PREMIUM_ENABLED=true`)

### Testing Premium with Test Entitlements

Discord provides test entitlements so you can verify your subscription flow without real payments. This uses Discord's official testing mechanism via the API.

**Setup:**
1. Create a subscription SKU in the [Discord Developer Portal](https://discord.com/developers/applications) under your app's Monetization settings
2. Set `PREMIUM_ENABLED=true` and `DISCORD_PREMIUM_SKU_ID=<your_sku_id>` in your `.env`
3. Run `bun dev`

**Testing the upsell flow (no entitlement):**
- Use `/premium` — you'll see the premium info embed with a purchase button

**Testing the subscribed flow (with test entitlement):**
- Use `/owner premium test-create` to grant the current server a test entitlement (optionally pass `guild:` to target another server)
- Use `/premium` again — you'll now see the "Premium Active" embed
- Use `/owner premium test-delete entitlement_id:<id>` to remove the test entitlement when done

**Owner commands for test entitlements:**
- `/owner premium test-create [guild]` — Creates a guild-level test entitlement via `client.application.entitlements.createTest()`. Defaults to the current server. Returns the entitlement ID.
- `/owner premium test-delete <entitlement_id>` — Deletes a test entitlement via `client.application.entitlements.deleteTest()`.

These commands are restricted to the bot owner only (`OWNER_ID` env var).

### Custom Quote Timing (Premium)

Premium guilds can customize their quote delivery schedule via `/setup schedule`:
- **Frequency**: Daily (default), Weekly, or Monthly
- **Time**: HH:mm format (default: `08:00`)
- **Timezone**: Any IANA timezone with autocomplete (default: `America/Chicago`)
- **Day**: Day of week (0-6) for weekly, day of month (1-28) for monthly

Non-premium guilds keep the default daily 8:00 AM America/Chicago schedule. The schedule evaluator (`src/utils/scheduleEvaluator.ts`) uses dayjs with timezone support to determine when each guild is due. If a premium subscription lapses, the custom schedule is retained (no automatic reset).

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

Tests use **bun:test** + **Sinon**, configured in `bunfig.toml`. Test files live in `tests/` (mirroring `src/` structure) and use `.test.ts` suffix. Module mocking uses `mock.module()` from `bun:test` to replace imports at load time. Time-dependent tests use `sinon.useFakeTimers()` to control `dayjs()`.

- `tests/helpers.ts` — Shared mock factories (mockLogger, mockDb, mockDbChain, mockInteraction, mockClient, mockEnv, etc.)
- `tests/utils/timezones.test.ts` — Timezone utilities (ALL_TIMEZONES, isValidTimezone, filterTimezones)
- `tests/utils/scheduleEvaluator.test.ts` — Schedule evaluator (getCurrentTimeInTimezone, isGuildDueForMotivation, catch-up window)
- `tests/utils/premium.test.ts` — Premium utilities (isPremiumEnabled, getPremiumSkuId, hasEntitlement)
- `tests/utils/permissions.test.ts` — Permission checks (isUserPermitted)
- `tests/utils/ownerGuard.test.ts` — Owner gate (requireOwner, requireApplication)
- `tests/utils/entitlementHelpers.test.ts` — Entitlement helpers (logEntitlementEvent, updateGuildPremiumStatus)
- `tests/utils/suggestionHelpers.test.ts` — Suggestion helpers (fetchPendingSuggestion)
- `tests/utils/guildDatabase.test.ts` — Guild database operations (pruneGuilds, ensureGuildExists, guildExists)
- `tests/events/guildCreate.test.ts` — Guild join event handler
- `tests/events/guildDelete.test.ts` — Guild leave event handler
- `tests/events/entitlementCreate.test.ts` — Entitlement created event
- `tests/events/entitlementDelete.test.ts` — Entitlement deleted event
- `tests/events/entitlementUpdate.test.ts` — Entitlement updated event (cancellation/renewal)
- `tests/events/interactionCreate.test.ts` — Command routing and error handling
- `tests/worker/index.test.ts` — Worker startup (job registration, shard-0 scheduler gating)
- `tests/worker/sendMotivation.test.ts` — Motivation job (schedule evaluation, embed sending, error isolation)
- `tests/worker/setActivity.test.ts` — Activity rotation job
- `tests/api/health.test.ts` — Health endpoint (supertest)
- `tests/commands/premium.test.ts` — Premium command (upsell, active, disabled states)
- `tests/commands/setup/schedule.test.ts` — Schedule command (validation, premium gate)
- `tests/commands/owner/testCreate.test.ts` — Owner test-create command (owner check, SKU check)

Run `bun test --coverage` to generate a coverage report.

## Setup Notes

If `node_modules` is missing, run `bun install` before type-checking. No code generation step is needed — Drizzle has no codegen.
