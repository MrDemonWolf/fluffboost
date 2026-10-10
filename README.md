# FluffBoost - Your Daily Dose of Furry Motivation

![FluffBoost Banner](banner.jpg)

A furry-friendly Discord bot that brings a little encouragement to your
community. Get daily motivational quotes in the channel you choose, request
an instant boost, or suggest a quote for the shared library. Optional
Premium adds custom scheduling for one server through Discord.

Spread joy, one quote at a time.

**[Website and documentation](https://mrdemonwolf.github.io/fluffboost/)**

## Features

- **Daily Motivation** - Free quotes delivered to a chosen channel at
  8:00 AM America/Chicago, plus instant quotes with `/quote`.
- **Premium Scheduling** - Optional Discord server subscription for daily,
  weekly, or monthly frequency with a custom time and timezone.
- **Community Suggestions** - Quote submissions reviewed by the bot team
  for a shared library across servers, with review-result notifications.
- **Bot Management** - Authorized operators manage quotes, activities,
  and suggestion reviews through slash commands.
- **Reliable Delivery** - Sharding, scheduled jobs, delivery deduplication,
  and an HTTP health endpoint support operation of the hosted bot.
- **Website and Guides** - A static Next.js and Fumadocs site with setup,
  Premium activation, developer guides, privacy, and terms.

## Getting Started

[Read the server guide](https://mrdemonwolf.github.io/fluffboost/docs/) for
setup and troubleshooting.

1. Invite FluffBoost to your server using
   [this link](https://discord.com/oauth2/authorize?client_id=1152416549261561856&permissions=19456&scope=bot%20applications.commands).
2. As a server administrator, use `/setup channel` to choose the text
   channel for daily quotes. The bot needs View Channel, Send Messages,
   and Embed Links there.
3. Try `/quote` now and enjoy the default daily 8:00 AM America/Chicago boost.

To upgrade one server, follow the
[Premium activation guide](https://mrdemonwolf.github.io/fluffboost/docs/premium/):
run `/premium`, subscribe through Discord desktop or browser, confirm
**Premium Active**, and set your timing with `/setup schedule`.

Read the [Privacy Policy](https://mrdemonwolf.github.io/fluffboost/privacy/)
and [Terms of Service](https://mrdemonwolf.github.io/fluffboost/terms/).

## Usage

FluffBoost uses Discord slash commands grouped by role.

### General Commands

| Command       | Description                              |
| ------------- | ---------------------------------------- |
| `/about`      | Learn about the bot and its creators     |
| `/help`       | View available commands                  |
| `/invite`     | Get the bot invite link                  |
| `/quote`      | Receive an instant motivational quote    |
| `/suggestion` | Suggest a quote for review               |
| `/premium`    | View premium subscription info           |
| `/changelog`  | View recent changes                      |

`/suggestion`, `/premium` and `/setup` work only inside a server.

### Admin Commands

These manage shared content and are restricted to users in the operator's
`ALLOWED_USERS` (an empty list disables them). Your own server's
administrator role does not grant access. Discord also shows `/admin` only
to members with Administrator by default, so an authorized operator needs
Administrator (or a Server Settings > Integrations override) in the server
where they run it.

| Command                     | Description                  |
| --------------------------- | ---------------------------- |
| `/admin quote create`       | Add a new motivational quote |
| `/admin quote list`         | List all quotes              |
| `/admin quote remove`       | Remove a quote               |
| `/admin activity create`    | Add a bot status activity    |
| `/admin activity list`      | List all activities          |
| `/admin activity remove`    | Remove an activity           |
| `/admin suggestion approve` | Approve a suggested quote    |
| `/admin suggestion reject`  | Reject a suggested quote     |
| `/admin suggestion list`    | List suggestions             |
| `/admin suggestion stats`   | View suggestion statistics   |

### Setup Commands

Require Administrator in the server.

| Command           | Description                             |
| ----------------- | --------------------------------------- |
| `/setup channel`  | Set the quote delivery channel          |
| `/setup schedule` | Customize timing and timezone (Premium) |

### Owner Commands

Owner test commands are available in development and staging, and excluded
from production command registration. Keep test entitlements on separate
test applications.

| Command                      | Description                                |
| ---------------------------- | ------------------------------------------ |
| `/owner premium test-create` | Create a test entitlement                  |
| `/owner premium test-delete` | Delete a test entitlement                  |
| `/owner premium test-list`   | List all entitlements (test grants marked) |

## Tech Stack

| Layer            | Technology                                    |
| ---------------- | --------------------------------------------- |
| Runtime          | Bun                                           |
| Language         | TypeScript 5.x (strict mode)                  |
| Discord Library  | Discord.js v14                                |
| Database         | PostgreSQL 18 via Drizzle ORM                 |
| Job Queue        | BullMQ with Redis 8                           |
| HTTP Server      | Express 5                                     |
| Containerization | Docker (multi-stage, Bun)                     |
| Monorepo         | Bun workspaces + Turborepo                    |
| Marketing & docs | Next.js 16 + Fumadocs (static, GitHub Pages)  |
| Brand animation  | Remotion                                      |
| CI/CD            | GitHub Actions                                |
| Deployment       | Docker on Dokploy                             |

## Development

### Prerequisites

- Bun 1.3.14 (the version pinned in `package.json`)
- PostgreSQL 18 (or use Docker Compose)
- Redis 8 (or use Docker Compose)
- A Discord application with bot token
- `ffmpeg` and `ffprobe`, only for `bun run brand:verify`

### Setup

Run everything from the repository root. Bun resolves the whole workspace.

1. Clone the repository:

   ```bash
   git clone https://github.com/MrDemonWolf/fluffboost.git
   cd fluffboost
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Copy and configure environment variables. Required:
   `DISCORD_APPLICATION_BOT_TOKEN`, `OWNER_ID` and `MAIN_CHANNEL_ID` (the
   template's database and Redis URLs match Compose):

   ```bash
   cp apps/discord/.env.example apps/discord/.env
   ```

4. Start local infrastructure (PostgreSQL 18 + Redis 8 on `127.0.0.1`; the
   bot is not started):

   ```bash
   docker compose up -d
   ```

   To run the bot in a container instead, use
   `docker compose --profile bot up --build`. It publishes the health API on
   `127.0.0.1:3000` and needs Docker Compose 2.24+ for the optional
   `env_file`.

5. Sync the database schema (use `bun run db:migrate` instead if you will
   also run the bot container against this database, since its startup
   migration refuses a schema with no migration history):

   ```bash
   bun run db:push
   ```

6. Load the starter quotes:

   ```bash
   bun run db:seed
   ```

7. Start the bot in watch mode:

   ```bash
   bun run dev:discord
   ```

### Development Scripts

Run these from the repository root; they fan out through Turborepo.

- `bun run dev:discord` - Start the bot with hot reload
- `bun run dev:docs` - Start the marketing/docs site
- `bun run dev:motion` - Preview the Remotion brand compositions
- `bun run dev` - Start all three workspaces at once
- `bun run build` - Build the docs static export (`apps/docs/out`)
- `bun run brand:render` - Render PNG/MP4/GIF brand exports
- `bun run brand:verify` - Verify the committed brand exports
- `bun run lint` / `bun run lint:check` - ESLint (with / without fixes)
- `bun run format` - Format code with Prettier
- `bun run typecheck` - TypeScript type checking
- `bun run test` - Bot unit tests
- `bun run test:coverage` - Bot unit tests with coverage (what CI runs)
- `bun run test:e2e` - Bot (real PostgreSQL) and browser end-to-end suites
- `bun run db:push` - Sync schema to database (dev)
- `bun run db:generate` - Generate a Drizzle migration
- `bun run db:migrate` - Run migrations (production)
- `bun run db:studio` - Open Drizzle Studio UI
- `bun run db:seed` - Load the starter quote library (safe to re-run)
- `bun run db:reconcile --confirm` - Bring a Prisma-era or drifted database to the current schema and record the baseline (back up first)

To build the GitHub Pages site with its production prefix, run
`NEXT_PUBLIC_BASE_PATH=/fluffboost bun run --filter=@fluffboost/docs build`.
The [developer guide](https://mrdemonwolf.github.io/fluffboost/developers/)
covers deployment, configuration, testing, Premium, and contributing. The
[Remotion workspace](apps/motion/README.md) documents the brand animation
sources and exports.

### Code Quality

- ESLint (`@eslint/js` recommended + typescript-eslint rules)
- Strict TypeScript (`noUnusedLocals`, `noUnusedParameters`,
  `noImplicitReturns`, `noUncheckedIndexedAccess`)
- bun:test + Sinon unit tests, supertest for the health API
- Bot end-to-end tests against real PostgreSQL
- Playwright and axe-core for desktop and mobile-width website flows
- Schema drift, dependency audit, brand export and Docker image checks in
  GitHub Actions

## Project Structure

```text
fluffboost/
├── apps/
│   ├── discord/                # The Discord bot
│   │   ├── src/
│   │   │   ├── api/            # Express health API (/api/health, /live)
│   │   │   ├── commands/       # Slash commands (admin/, owner/, setup/)
│   │   │   ├── database/       # Drizzle client, schema and migrator
│   │   │   ├── events/         # Discord event handlers + command registry
│   │   │   ├── redis/          # Redis/IORedis connections
│   │   │   ├── utils/          # Shared utilities
│   │   │   └── worker/         # BullMQ worker and jobs
│   │   ├── tests/              # Unit tests (mirror src/)
│   │   ├── e2e/                # End-to-end tests against real PostgreSQL
│   │   ├── scripts/            # Maintenance scripts (quote seed)
│   │   ├── drizzle/            # Migration SQL and journal
│   │   ├── Dockerfile          # Multi-stage build (turbo prune)
│   │   └── docker-entrypoint.sh
│   ├── docs/                   # Marketing site + docs (Next.js + Fumadocs)
│   │   ├── app/                # Landing page + docs routes
│   │   ├── content/            # user/ (Guide) + developer/ docs (MDX)
│   │   └── e2e/                # Browser flows against the static export
│   └── motion/                 # Remotion brand animations
├── assets/brand/               # Brand artwork
│   ├── motion-sources/         # Backplates used by apps/motion
│   └── animated/               # Rendered Discord and marketing exports
├── docs/                       # Marketing copy and artwork brief
├── docker-compose.yml          # Local PostgreSQL + Redis (bot: --profile bot)
├── turbo.json                  # Turborepo pipeline
└── package.json                # Bun workspace root
```

## License

![GitHub license](https://img.shields.io/github/license/mrdemonwolf/fluffboost.svg?style=for-the-badge&logo=github)

## Contact

If you have any questions, suggestions, or feedback:

- Website & docs: [mrdemonwolf.github.io/fluffboost](https://mrdemonwolf.github.io/fluffboost/)
- Developer guide: [mrdemonwolf.github.io/fluffboost/developers](https://mrdemonwolf.github.io/fluffboost/developers/)
- Discord: [Join my server](https://mrdwolf.net/discord)

Made with love by [MrDemonWolf, Inc.](https://www.mrdemonwolf.com)
