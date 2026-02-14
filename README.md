# FluffBoost - Furry Motivation Discord Bot 🐾

![FluffBoost Banner](banner.jpg)

Your Daily Dose of Furry Motivation! Let my friendly community bot deliver daily uplifting quotes and heartwarming messages to brighten your day. Whether you need inspiration, a positivity boost, or just a reason to smile, it’s here to make every day better.

Celebrate furry culture and positivity with messages that inspire kindness, growth, and happiness. Together, let’s create a supportive and welcoming atmosphere.

Start your day with a smile or find encouragement when you need it most. Let’s spread joy, one quote at a time!

## Features

- **Daily Motivational Quotes**: Automatically delivered to all configured server channels, with reliable delivery across shards.
- **Per-Guild Scheduling**: Each server can set its own motivation time and timezone.
- **Premium Subscriptions**: Optional premium tier via Discord App Subscriptions with custom quote scheduling (daily, weekly, or monthly), custom times, and timezone selection.
- **Rotating Bot Status**: Customizable bot presence that cycles through activities on a configurable interval.
- **Easy Integration**: Simple setup for any Discord server.
- **Community-Driven**: Open-source development powered by furries, for furries! 🐺🐾

## Getting Started

To add FluffBoost to your Discord server, follow these simple steps:

1. Invite FluffBoost to your server using [this link](https://discord.com/api/oauth2/authorize?client_id=1152416549261561856&permissions=2147551232&scope=bot).
2. Enjoy daily motivation and inspiration delivered to your server! 🎉

## Usage

FluffBoost is user-friendly and easy to set up. Here’s a quick guide to the basic commands:

- `/about` - Learn about the bot and its creators.
- `/invite` - Invite FluffBoost to your server.
- `/quote` - Receive an instant motivational quote.
- `/suggestion` - Make a quote suggestion for the owner to review.
- `/setup` - Configure bot settings like the target channel for quotes (admin only).
- `/setup schedule` - Customize quote delivery frequency, time, and timezone (premium).
- `/premium` - View premium subscription info and status.

# Change Log
For detailed changelog information, see [CHANGELOG.md](CHANGELOG.md).

## Development

### Prerequisites

- Node.js 20.x, 22.x, or 24.x
- pnpm 9.x
- PostgreSQL database
- Redis server

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/MrDemonWolf/fluffboost.git
   cd fluffboost
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`

   - Optional: enable Redis debug logging by adding `DEBUG=ioredis:*` to your `.env` (the `.env.example` includes this line commented out).

5. Generate Prisma client:

   ```bash
   pnpm db:generate
   ```

6. Run database migrations:
   ```bash
   pnpm db:push
   ```

### Development Scripts

- `pnpm dev` - Start development server with hot reload
- `pnpm build` - Build the project for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint and auto-fix issues
- `pnpm lint:check` - Check code style without fixing
- `pnpm tsc --noEmit` - Run TypeScript type checking
- `pnpm db:studio` - Open Prisma Studio to view/edit database
- `pnpm test` - Run tests (131 tests across 20 files)
- `pnpm test:coverage` - Run tests with c8 coverage report

### Code Quality

This project uses:

- **ESLint** with TypeScript support for code linting
- **TypeScript** for type safety
- **Prisma** for database management
- **Consola** for centralized logging
- **Mocha** + **Chai** + **Sinon** + **esmock** for testing (131 tests)
- **c8** for V8-based code coverage
- **supertest** for HTTP endpoint testing

The CI pipeline automatically runs (on Node 20.x, 22.x, and 24.x):

- Test execution with coverage reporting
- TypeScript type checking
- ESLint linting
- Build verification
- Security audits
- Docker build tests

## License

![GitHub license](https://img.shields.io/github/license/MrDemonWolf/fluffboost.svg?style=for-the-badge&logo=github)

## Contact

If you have any questions, suggestions, or feedback, feel free to reach out to us on Discord!

- Discord: [Join my server](https://mrdwolf.net/discord)

Thank you for choosing FluffBoost to add motivation and positivity to your Discord server!

Made with ❤️ by <a href="https://www.mrdemonwolf.com">MrDemonWolf, Inc.</a>
