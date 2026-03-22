# FluffBoost - Your Daily Dose of Furry Motivation

![FluffBoost Banner](banner.jpg)

A furry-friendly Discord bot that delivers scheduled
motivational quotes and heartwarming messages to your server.
Whether you need inspiration, a positivity boost, or just
a reason to smile, FluffBoost is here to make every day
better with per-guild scheduling, premium subscriptions,
and community-driven quotes.

Spread joy, one quote at a time.

## Features

- **Scheduled Motivational Quotes** — Automatically delivered
  to configured channels on a per-guild schedule with reliable
  delivery across shards.
- **Per-Guild Scheduling** — Each server sets its own delivery
  time and timezone.
- **Premium Subscriptions** — Optional premium tier via Discord
  App Subscriptions with custom frequency (daily, weekly, or
  monthly), time, and timezone selection.
- **Community Suggestions** — Users can suggest quotes for
  server admins to review, approve, or reject.
- **Rotating Bot Status** — Customizable bot presence that
  cycles through activities on a configurable interval.
- **Admin Dashboard** — Manage quotes, activities, and
  suggestion reviews through slash commands.
- **Health Check API** — Express-based health endpoint for
  monitoring and orchestration.
- **Sharded Architecture** — Scales across multiple shards
  with Discord.js ShardingManager.

## Getting Started

1. Invite FluffBoost to your server using
   [this link](https://discord.com/api/oauth2/authorize?client_id=1152416549261561856&permissions=2147551232&scope=bot).
2. Use `/setup channel` to configure which channel receives
   quotes.
3. Enjoy daily motivation delivered to your server.

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

### Admin Commands

| Command                      | Description                        |
| ---------------------------- | ---------------------------------- |
| `/admin quote create`        | Add a new motivational quote       |
| `/admin quote list`          | List all quotes                    |
| `/admin quote remove`        | Remove a quote                     |
| `/admin activity create`     | Add a bot status activity          |
| `/admin activity list`       | List all activities                |
| `/admin activity remove`     | Remove an activity                 |
| `/admin suggestion approve`  | Approve a suggested quote          |
| `/admin suggestion reject`   | Reject a suggested quote           |
| `/admin suggestion list`     | List pending suggestions           |
| `/admin suggestion stats`    | View suggestion statistics         |

### Setup Commands

| Command            | Description                              |
| ------------------ | ---------------------------------------- |
| `/setup channel`   | Set the quote delivery channel           |
| `/setup schedule`  | Customize delivery frequency and time    |

### Owner Commands

| Command                      | Description                        |
| ---------------------------- | ---------------------------------- |
| `/owner premium test-create` | Create a test entitlement          |
| `/owner premium test-delete` | Delete a test entitlement          |

## Tech Stack

| Layer            | Technology                               |
| ---------------- | ---------------------------------------- |
| Runtime          | Bun                                      |
| Language         | TypeScript 5.x (strict mode)            |
| Discord Library  | Discord.js v14                           |
| Database         | PostgreSQL 16 via Drizzle ORM             |
| Job Queue        | BullMQ with Redis 7                      |
| HTTP Server      | Express 5                                |
| Containerization | Docker (multi-stage, Bun)                |
| CI/CD            | GitHub Actions                           |
| Deployment       | Coolify                                  |

## Development

### Prerequisites

- Bun
- PostgreSQL 16 (or use Docker Compose)
- Redis 7 (or use Docker Compose)
- A Discord application with bot token

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/MrDemonWolf/fluffboost.git
   cd fluffboost
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Start local infrastructure:

   ```bash
   docker compose up -d
   ```

4. Copy and configure environment variables:

   ```bash
   cp .env.example .env
   ```

5. Sync the database schema:

   ```bash
   bun run db:push
   ```

6. Start the development server:

   ```bash
   bun dev
   ```

### Development Scripts

- `bun dev` — Start development server with hot reload
- `bun start` — Run src/app.ts directly
- `bun run lint` — Run ESLint with auto-fix
- `bun run lint:check` — Check linting without fixing
- `bun run format` — Format code with Prettier
- `bun run typecheck` — Run TypeScript type checking
- `bun run db:push` — Sync schema to database (dev)
- `bun run db:generate` — Generate a Drizzle migration
- `bun run db:migrate` — Run migrations (production)
- `bun run db:studio` — Open Drizzle Studio UI
- `bun test` — Run test suite
- `bun test --coverage` — Run tests with coverage

### Code Quality

- ESLint with TypeScript and Airbnb base config
- Strict TypeScript (`noUnusedLocals`,
  `noUnusedParameters`, `noImplicitReturns`,
  `noUncheckedIndexedAccess`)
- bun:test + Sinon test framework
- supertest for HTTP endpoint testing
- CI runs via GitHub Actions with Bun

## Project Structure

```
fluffboost/
├── src/
│   ├── api/              # Express health-check API
│   │   └── routes/       # API route handlers
│   ├── commands/         # Discord slash commands
│   │   ├── admin/        # Admin command group
│   │   │   ├── activity/ # Bot activity management
│   │   │   ├── quote/    # Quote management
│   │   │   └── suggestion/ # Suggestion review
│   │   ├── owner/        # Owner-only commands
│   │   │   └── premium/  # Test entitlement commands
│   │   └── setup/        # Server setup commands
│   ├── database/         # Drizzle ORM instance and schema
│   ├── events/           # Discord event handlers
│   ├── redis/            # Redis/IORedis connection
│   ├── utils/            # Shared utilities
│   └── worker/           # BullMQ worker and jobs
│       └── jobs/         # Job handlers
├── tests/                # Test suite (mirrors src/)
├── drizzle/              # Drizzle migration SQL files
├── Dockerfile            # Multi-stage production build
├── docker-compose.yml    # Local PostgreSQL + Redis
└── docker-entrypoint.sh  # Migration runner for deploy
```

## Changelog

For detailed changelog information, see
[CHANGELOG.md](CHANGELOG.md).

## License

![GitHub license](https://img.shields.io/github/license/mrdemonwolf/fluffboost.svg?style=for-the-badge&logo=github)

## Contact

If you have any questions, suggestions, or feedback:

- Discord: [Join my server](https://mrdwolf.net/discord)

Made with love by [MrDemonWolf, Inc.](https://www.mrdemonwolf.com)
