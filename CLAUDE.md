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
pnpm prisma:generate      # Generate Prisma client (outputs to src/generated/prisma/)
pnpm prisma:push          # Sync schema to database (dev)
pnpm prisma:migrate       # Run migrations (production)
pnpm prisma:studio        # Open Prisma Studio UI

# Type checking
pnpm tsc --noEmit         # TypeScript check without emitting

# Tests
pnpm test                 # Mocha tests (cross-env NODE_ENV=test)

# Infrastructure
docker-compose up         # Start PostgreSQL 16 + Redis 7 locally
```

**After changing `prisma/schema.prisma`**, always run `pnpm prisma:generate` to regenerate the client, then `pnpm prisma:push` (dev) or `pnpm prisma:migrate` (prod) to sync the database.

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
- `send-motivation` — Sends daily motivational quotes to configured guild channels on a cron schedule.

### Database Models

Four Prisma models: `Guild` (server config with per-guild motivation time/timezone), `MotivationQuote`, `SuggestionQuote` (user-submitted, pending approval), `DiscordActivity` (bot status entries with type enum).

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

GitHub Actions runs on push/PR to `main` and `dev`: ESLint check, TypeScript type check, build, security audit, and Docker build test. Tested on Node 20.x and 22.x.

## Git Branching

- `main` — Production branch
- `dev` — Development integration branch
- Feature branches follow pattern `FLUFF-{number}-description`
