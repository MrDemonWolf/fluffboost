# Change Log

All notable changes to FluffBoost will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

Everything since 2.0.0, including the October 2026 reliability, security and
documentation remediation. No release has been tagged yet.

### Upgrading (operators)

- **Monorepo and Bun.** The bot now lives in `apps/discord` of a Bun workspace
  + Turborepo monorepo; pnpm and Node are no longer used. In Dokploy keep the
  build context at the repository root and set the Dockerfile path to
  `apps/discord/Dockerfile`.
- **Prisma to Drizzle.** The database layer is Drizzle ORM. Migrations run at
  container startup (`docker-entrypoint.sh` runs `src/database/migrate.ts`);
  `SKIP_MIGRATIONS=true` skips that step.
- **Baseline check before the first migrating deploy.** If your database was
  built with `db:push` or Prisma, it has the tables but no Drizzle migration
  history. The entrypoint now stops with `Migration aborted: Existing schema
  without migration history: baseline required` instead of crash-looping on
  `CREATE TYPE`. If the schema diff against a fresh database is empty (a
  `db:push` of the current schema), follow "Baseline an existing database" in
  the deployment guide; its SQL now refuses a drifted schema. A **Prisma-era**
  or otherwise drifted database must instead go through "Reconcile a legacy
  database": stop the bot, `pg_dump --format=custom`, then
  `bun run db:reconcile --confirm`, which rebuilds the tables in one
  transaction, keeps every row (mapping old enum labels and the `0 8 * * *`
  default time), drops `SuggestionQuote.guildId` from early Prisma databases,
  and records the baseline. Set `SKIP_MIGRATIONS=true` until you have. A
  missing migration journal is now also fatal instead of a silent no-op, and
  the bot refuses to start ("Database schema missing") when `public."Guild"`
  does not exist.
- **Dokploy settings to change.** Point the health check at
  `/api/health/live`, set the Swarm Stop Grace Period to 35 seconds
  (`35000000000` ns), and set Update and Rollback Config to stop-first
  (`{"Parallelism":1,"Order":"stop-first","FailureAction":"rollback"}`) so two
  bot instances never share a token during a deploy.
- **Environment.** Only `DATABASE_URL`, `REDIS_URL`,
  `DISCORD_APPLICATION_BOT_TOKEN`, `OWNER_ID` and `MAIN_CHANNEL_ID` are
  required. `DISCORD_APPLICATION_ID`, `DISCORD_APPLICATION_PUBLIC_KEY` and
  `MAIN_GUILD_ID` are no longer read and can be removed. New optional
  variables: `DATABASE_POOL_MAX`, `DATABASE_QUERY_LOG`, `WORKER_CONCURRENCY`,
  `HOST`. `PORT` must be a number from 1 to 65535. An empty
  `DISCORD_PREMIUM_SKU_ID` now counts as unset. `VERSION` defaults to the
  package version instead of `0.0.0-dev`. The bot no longer uses dotenv; Bun
  loads `.env` itself.
- **`PREMIUM_ENABLED=false` means Premium gating is off.** Custom schedules
  are then open to every server. A hosted bot that sells Premium must set
  `PREMIUM_ENABLED=true`.
- **Local development.** `docker compose up -d` now starts only PostgreSQL 18
  and Redis 8 on `127.0.0.1`. PostgreSQL 18 keeps its data under `/var/lib/postgresql`, so an existing
  local PostgreSQL 17 volume will not start: dump it first, or reset it with
  `docker compose down -v`. The bot container is opt-in
  (`docker compose --profile bot up --build`). The `.env.example` database URL
  now matches Compose (`postgres:postgres`). Run `db:*` scripts from the root;
  they invoke drizzle-kit under Bun.
- **Seeding.** `bun run db:seed` needs only `DATABASE_URL` and `OWNER_ID`. In
  production, run it inside the bot container (Dokploy terminal or
  `docker exec`).

### Added

- Suggestion review system: `/admin suggestion list|approve|reject|stats`,
  review-result DMs, and a per-user limit of 3 suggestions every 24 hours,
  shared across shards through Redis.
- `/owner premium test-list` to inspect entitlements outside production.
- `GET /api/health/live`, a dependency-free liveness endpoint for container
  health checks. `GET /api/health` remains the readiness endpoint (`503` while
  Postgres or Redis is down) for external monitors.
- Premium entitlements are re-checked on every shard every 30 minutes, so
  delivery falls back to the free schedule within about 30 minutes after a
  subscription ends, even if a Discord event was missed.
- Marketing site and documentation at
  <https://mrdemonwolf.github.io/fluffboost/>, with a sitemap, per-page
  canonical and social metadata, a branded 404 page and accessibility fixes.
- Reproducible Remotion brand animations in `apps/motion`, verified in CI.
- Bot end-to-end tests against real PostgreSQL, and browser end-to-end tests
  of the static site.

### Changed

- `/setup schedule` keeps saved values for options you leave out, so
  `/setup schedule time:10:00` changes only the time. Changing the frequency
  asks for a new `day`.
- `/setup`, `/premium` and `/suggestion` are available only inside servers.
- `/suggestion` acknowledges right away, so slow lookups no longer time out
  the interaction.
- `/admin suggestion stats` shows the approval rate over reviewed suggestions
  only, and `N/A` when nothing has been reviewed.
- `/about` counts servers across all shards.
- `/help` and `/changelog` list the owner test commands only outside
  production. Default-schedule text in `/changelog` and the `/setup schedule`
  upsell comes from the bot's configuration.
- Timezone autocomplete matches spaces, underscores and hyphens, ranks city
  names first, includes modern IANA names such as `Asia/Kolkata` and
  `Europe/Kyiv`, and suggests common zones before you type.
- Quote delivery is sent in batches of 25. Each guild is claimed right before
  its send; temporary Discord or network errors release the claim for a
  retry, permanent channel errors keep it. Each message carries a
  deterministic nonce, so a retry cannot post the same quote twice.
- Background jobs use BullMQ job schedulers, have time limits (60 seconds for
  presence, 10 minutes for delivery) and stop cleanly on shutdown.
- Startup waits for Postgres and Redis (about 45 seconds of retries) before
  spawning shards, and startup steps no longer crash a shard when one fails.
- Shutdown fits a 35-second budget: the HTTP server and shards stop in
  parallel and Redis and Postgres close with time limits.
- A shard that dies 5 times within 15 minutes now exits the container so the
  orchestrator's restart backoff applies, instead of respawning forever.
- Postgres connections have a 15-second statement timeout and a 30-second
  idle-in-transaction timeout.
- Logs now include error messages, stacks and context, and HTTP access logs
  no longer record client IPs, user agents or query strings.

### Fixed

- A malformed schedule row (out-of-range day, invalid timezone) is logged and
  skipped instead of failing the whole delivery run.
- Announcements reach the main channel from any shard.
- Removing a quote or activity is a single atomic delete, so concurrent removes
  cannot both report success.
- Malformed quote, activity and suggestion IDs return "not found" instead of a
  generic error.
- Approving an oversized legacy suggestion is refused instead of copying it
  into the library.
- Unknown or retired commands get an ephemeral "This command is no longer
  available." reply instead of no response.
- Premium no longer loses a fresh purchase when a reconciliation runs at the
  same time, and entitlement pagination no longer stops early.

### Security

- Production ignores both owner test entitlements and Application Test Mode
  purchases.
- `/admin` checks the operator allow-list before reading any options.
- Staff-facing suggestion embeds escape submitted text.
- Dependency overrides were rebuilt; `bun audit` reports no known
  vulnerabilities.
- CI and the docs deploy workflow use least-privilege permissions, pinned
  actions and job timeouts; `.env.*` files are ignored by git.

## [2.0.0] - 2026-02-13

### Major Upgrades

- **Prisma 7:** Upgraded to Prisma 7 with enhanced TypeScript support and improved performance.
- **Health Check API:** Renamed status API endpoint from /status to /api/health for better REST conventions.
- **Optimized Docker Builds:** Enhanced Dockerfile with better layer caching and multi-stage builds for significantly faster build times.

### Added

- **Premium Subscriptions:** Added support for Discord App Subscriptions (SKUs & Entitlements) with `/premium` command to view subscription info and status.
- **Custom Quote Scheduling (Premium):** Premium servers can customize their quote delivery schedule via `/setup schedule` — choose daily, weekly, or monthly frequency with a custom time and timezone.
- **Per-Guild Scheduling:** Each server now has its own independent motivation schedule. Non-premium servers keep the default daily 8:00 AM (America/Chicago) delivery.
- **Timezone Autocomplete:** The `/setup schedule` command includes autocomplete for IANA timezones for easy selection.
- **Owner Commands:** Added `/owner` command group with premium test entitlement management (`test-create` / `test-delete`).
- **Entitlement Event Handlers:** Bot now listens for entitlement create, update, and delete events from Discord.
- **Reliable Background Jobs:** Switched to reliable background jobs for Discord activity and daily motivation, ensuring consistent delivery.
- **Configurable Activity Updates:** Activity update interval is now configurable via `DISCORD_ACTIVITY_INTERVAL_MINUTES` environment variable.
- **Comprehensive Test Suite:** 131 tests across 20 files covering utilities, events, workers, API, and commands using Mocha + Chai + Sinon + esmock + supertest.
- **Code Coverage:** Added c8 for V8-based coverage reporting (`pnpm test:coverage`).

### Improved

- **Motivation Worker:** Rewritten to evaluate per-guild schedules every minute using dayjs with timezone support, replacing the single global cron approach.
- **ESLint Config:** Fixed ESLint configuration to work with ESM (`import`/`export` instead of `require`/`module.exports`).
- **CI Pipeline:** Added Node 24.x to test matrix, concurrency groups to cancel stale runs, and coverage artifact uploads. Fixed Prisma generate step and ESLint now passes in CI.

### Fixed

- **Daily Motivation Delivery:** Fixed critical bug where daily motivation messages silently failed to deliver to most guilds. Replaced `client.channels.cache.get()` with `client.channels.fetch()` so channels are fetched from the API when not cached (e.g., after restarts or across shards). All guild sends are now properly awaited using `Promise.allSettled()` with per-guild error handling and sent/failed summary logging.
- **Worker Logging:** Standardized worker log component names and improved job completion/failure log messages for better readability.
- **Discord Status Quoting:** Corrected default Discord status quoting for proper display formatting.

### Changed

- **Script Names:** Renamed `prisma:*` scripts to `db:*` (e.g., `pnpm db:generate`, `pnpm db:push`).
- **Redis Client Stability:** Enhanced Redis client stability settings for more reliable connection handling and performance.
- **Docker Configuration Updates:** Updated docker-compose default database name for improved development environment consistency.
- **Database Schema Alignment:** Database migrations to align schema including SuggestionQuote and Guild field updates for better data consistency.

### Documentation

- Prisma Migration Guide: Added comprehensive Prisma migration comparison guide to assist with database schema changes.
- Redis Debug Logging: Documented Redis debug logging configuration in README and .env example for better troubleshooting.

## [1.9.0] - 2025-09-10

### Added

- BullMQ Worker System: Replaced node-cron with BullMQ for reliable background job processing with Redis-backed queues.
- Configurable Activity Interval: Bot activity rotation interval is now configurable via `DISCORD_ACTIVITY_INTERVAL_MINUTES` environment variable.

### Fixed

- Discord Status Quoting: Corrected default Discord status quoting for proper display formatting.

### Changed

- Redis Client Stability: Enhanced Redis client stability settings for more reliable connection handling and performance.
- Docker Configuration Updates: Updated docker-compose default database name for improved development environment consistency.

## [1.8.0] - 2025-09-03

### Added

- Enhanced Quote Command Embeds: Improved quote command embeds with author avatar and footer for a more engaging user experience.
- Updated Invite Link Generation: Invite links now include all required OAuth scopes for seamless bot integration.

### Documentation

- Migration Guides: Added comprehensive Queue and Worker Migration Guides to assist with system transitions.
- Enhanced README: Expanded README with detailed development setup instructions, available scripts, and CI pipeline information.

### Changed

- Unified Logging System: Implemented structured logging across API, bot commands, events, and workers for better monitoring and debugging.
- CI Workflow Implementation: Introduced comprehensive CI workflow with automated tests, security checks, and Docker build verification.
- ESLint Configuration: Added ESLint configuration and updated lint/type-check scripts for improved code quality standards.
- Database Schema Updates: Updated database schema for suggestions to track updates and simplified field structures.
- Code Cleanup: Removed unused queue utility and legacy command logger to streamline the codebase.

## [1.7.0] - 2025-07-28

### Added

- Activity Deletion Command: Added a command to delete user activities.
- Ephemeral Messages: Implemented support for ephemeral (private) responses using flags.
- New Quote Creation Notifications: Introduced notifications when a new quote is successfully created.

### Changed

- Database & Cache Stability: Enhanced pre-pruning checks to ensure the guild cache or database is not empty, preventing potential errors.
- Task Scheduling: Adjusted the frequencies of various scheduled tasks.
- Environment Variable Handling: Improved validation for environment variables at startup.
- Quote Management: Enhanced the quote removal command and refactored the internal logic for quote creation.
- Code Quality: Significant improvements in code readability and consistency across the codebase.
- Admin Command Experience: Better handling and more informative error reporting for administrative commands.
- User Input & Error Handling: Strengthened input validation and improved error messaging for a smoother user experience.
- User Feedback: Updated success messages for setting activities and refined the appearance of suggestion embeds.
- Internal Logging: Migrated from basic `console.log` to a more structured and robust logging system.

[2.0.0]: https://github.com/mrdemonwolf/fluffboost/compare/v1.9.0...v2.0.0
[1.9.0]: https://github.com/mrdemonwolf/fluffboost/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/mrdemonwolf/fluffboost/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/mrdemonwolf/fluffboost/releases/tag/v1.7.0
