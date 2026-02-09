# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FluffBoost is a Discord bot (Discord.js v14) that delivers daily motivational quotes and manages bot status activities. It runs as a sharded bot process with an Express health-check API, PostgreSQL database (via Prisma 7), and BullMQ background jobs backed by Redis.

## Commands

```bash
# Development
pnpm dev                  # Run with tsx watch (hot reload)
pnpm build                # Compile TypeScript to dist/
pnpm start                # Run compiled dist/app.js

# Linting & formatting
pnpm lint                 # ESLint with auto-fix
pnpm lint:check           # ESLint check only (used in CI)
pnpm format               # Prettier formatting

# Database
pnpm db:generate          # Generate Prisma client (outputs to src/generated/prisma/)
pnpm db:push              # Sync schema to database (dev)
pnpm db:migrate           # Run migrations (production)
pnpm db:studio            # Open Prisma Studio UI

# Type checking
pnpm tsc --noEmit         # TypeScript check without emitting

# Tests
pnpm test                 # Mocha tests (cross-env NODE_ENV=test)

# Infrastructure
docker-compose up         # Start PostgreSQL 16 + Redis 7 locally
```

**After changing `prisma/schema.prisma`**, always run `pnpm db:generate` to regenerate the client, then `pnpm db:push` (dev) or `pnpm db:migrate` (prod) to sync the database.

## Architecture

### Entry Points & Process Model

The app uses **Discord.js ShardingManager**. `src/app.ts` is the main process — it verifies DB/Redis connectivity, starts the Express API server, then spawns shard processes that each run `src/bot.ts`. In development, shards are loaded via tsx; in production, from compiled JS in `dist/`.

Each shard (`src/bot.ts`) creates a Discord client, registers event listeners, initializes a BullMQ queue + worker, and logs into Discord.

### Key Directories

- `src/commands/` — Slash commands. Each file exports `slashCommand` (SlashCommandBuilder) and `execute(client, interaction)`. Subcommand groups live in subdirectories (`admin/`, `setup/`).
- `src/events/` — Discord event handlers. Command routing happens in `interactionCreate.ts` via a switch on `commandName`.
- `src/worker/` — BullMQ worker setup and job handlers (`jobs/setActivity.ts`, `jobs/sendMotivation.ts`). Jobs are dispatched on repeating schedules.
- `src/database/index.ts` — Prisma singleton using global caching pattern with `@prisma/adapter-pg`.
- `src/utils/env.ts` — Zod schema validating all environment variables at startup. The process exits immediately on invalid config.
- `src/utils/logger.ts` — Structured consola-based logger with context-specific sub-loggers (`logger.commands.*`, `logger.database.*`, `logger.api.*`, `logger.discord.*`).
- `src/generated/prisma/` — Auto-generated Prisma client (do not edit manually).

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

Four Prisma models: `Guild` (server config with per-guild motivation schedule including frequency, time, timezone, day, and `lastMotivationSentAt`), `MotivationQuote`, `SuggestionQuote` (user-submitted, pending approval), `DiscordActivity` (bot status entries with type enum). The `MotivationFrequency` enum (Daily/Weekly/Monthly) controls delivery cadence.

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
- **Package manager** — pnpm 9.x (do not use npm or yarn).

## Environment Variables

All env vars are validated by Zod in `src/utils/env.ts`. Required variables include: `DATABASE_URL`, `REDIS_URL`, `DISCORD_APPLICATION_ID`, `DISCORD_APPLICATION_PUBLIC_KEY`, `DISCORD_APPLICATION_BOT_TOKEN`, `OWNER_ID`, `MAIN_GUILD_ID`, `MAIN_CHANNEL_ID`, `POSTHOG_API_KEY`, `POSTHOG_HOST`. See `.env.example` for the full list.

## CI

GitHub Actions runs on push/PR to `main` and `dev`: Prisma client generation, test execution, ESLint check, TypeScript type check, build, security audit, and Docker build test. Tested on Node 20.x and 22.x.

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
3. Run `pnpm dev`

**Testing the upsell flow (no entitlement):**
- Use `/premium` — you'll see the premium info embed with a purchase button

**Testing the subscribed flow (with test entitlement):**
- Use `/owner premium test-create` to grant yourself a test entitlement (optionally pass `user:` to target another user)
- Use `/premium` again — you'll now see the "Premium Active" embed
- Use `/owner premium test-delete entitlement_id:<id>` to remove the test entitlement when done

**Owner commands for test entitlements:**
- `/owner premium test-create [user]` — Creates a test entitlement via `client.application.entitlements.createTest()`. Returns the entitlement ID.
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

Tests use **Mocha** + **Chai** + **Sinon**, configured in `.mocharc.yml` with `tsx` as the loader. Test files live in `tests/` (mirroring `src/` structure) and use `.test.ts` suffix. Time-dependent tests use `sinon.useFakeTimers()` to control `dayjs()`.

- `tests/utils/timezones.test.ts` — Unit tests for timezone utilities (ALL_TIMEZONES, isValidTimezone, filterTimezones)
- `tests/utils/scheduleEvaluator.test.ts` — Unit tests for schedule evaluator (getCurrentTimeInTimezone, isGuildDueForMotivation across Daily/Weekly/Monthly frequencies)

## Setup Notes

If `node_modules` is missing, run `pnpm install` then `pnpm db:generate` before building or type-checking.
