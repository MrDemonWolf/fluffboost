# GEMINI.md - FluffBoost Project Context

## Project Overview
FluffBoost is a sharded Discord bot (Discord.js v14) designed to deliver daily motivational quotes and manage bot status activities. It features per-guild scheduling, premium subscription support via Discord App Subscriptions, community quote suggestions, and a rotating status system.

### Core Tech Stack
- **Runtime**: Node.js (20.x, 22.x, 24.x)
- **Language**: TypeScript 5.x (ESM)
- **Discord Library**: Discord.js v14
- **Database**: PostgreSQL 16 via Prisma 7 (with `@prisma/adapter-pg`)
- **Queue/Background Jobs**: BullMQ with Redis 7
- **API**: Express 5 (Health Check API)
- **Validation**: Zod (Environment variables)
- **Testing**: Mocha, Chai, Sinon, esmock
- **Deployment**: Docker (Coolify), multi-stage builds

## Architecture & Process Model
The application operates using a sharded process model:
- **Main Process (`src/app.ts`)**: Initializes database and Redis connections, starts the Express health-check API, and manages shards using `ShardingManager`.
- **Shard Process (`src/bot.ts`)**: Each shard runs an instance of the Discord client, registers event listeners, and initializes a BullMQ worker for background tasks.
- **Background Jobs (`src/worker/`)**: BullMQ handles recurring jobs:
    - `set-activity`: Rotates bot presence.
    - `send-motivation`: Evaluates per-guild schedules and delivers quotes.

## Key Directories
- `src/commands/`: Slash command implementations. Each file exports `slashCommand` and `execute`.
- `src/events/`: Discord event handlers (e.g., `interactionCreate`, `ready`).
- `src/worker/`: BullMQ worker and job handlers.
- `src/utils/`: Shared utilities (env validation, logging, timezone handling, premium logic).
- `src/database/`: Prisma client singleton.
- `prisma/`: Database schema and migrations.
- `tests/`: Comprehensive test suite mirroring the `src/` structure.

## Development Workflows

### Essential Commands
- `pnpm install`: Install dependencies.
- `pnpm db:generate`: Regenerate the Prisma client (output to `src/generated/prisma/`).
- `pnpm db:push`: Sync schema to database (development).
- `pnpm dev`: Start the development server with hot-reload (`tsx watch`).
- `pnpm build`: Compile TypeScript to `dist/`.
- `pnpm start`: Run the compiled production build.
- `pnpm test`: Run the full test suite.
- `pnpm lint`: Run ESLint with auto-fix.

### Coding Conventions & Standards
- **ESM Modules**: The project uses `"type": "module"`. **All local imports must include the `.js` extension** (e.g., `import env from "./utils/env.js"`).
- **Strict TypeScript**: Adhere to strict typing (`noUnusedLocals`, `noUncheckedIndexedAccess`, etc.).
- **Logging**: Always use the structured `logger` from `src/utils/logger.ts`. Avoid `console.log`.
- **Database Access**: Use the Prisma singleton. Note that Prisma 7 in this project uses driver adapters; CLI tools require `prisma.config.ts`.
- **Discord.js Best Practices**:
    - Use `client.channels.fetch(id)` instead of `.cache.get(id)` for reliability across shards/restarts.
    - Implement channel type guards before sending messages.
- **Testing**: New features or bug fixes must include corresponding tests in `tests/` using `esmock` for module mocking and `sinon` for timers/spies.

## Configuration
All environment variables are strictly validated by Zod in `src/utils/env.ts`. Key variables include:
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL` (Redis)
- `DISCORD_APPLICATION_BOT_TOKEN`
- `PREMIUM_ENABLED` & `DISCORD_PREMIUM_SKU_ID` (for subscription features)

## Deployment Note
The project uses a multi-stage `Dockerfile`. Migrations are executed at runtime via `docker-entrypoint.sh`. Prisma 7 CLI tools are configured to use `prisma.config.ts` for database connectivity during migration steps.
