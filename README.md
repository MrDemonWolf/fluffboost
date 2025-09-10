# FluffBoost - Furry Motivation Discord Bot 🐾

![FluffBoost Banner](banner.jpg)

Your Daily Dose of Furry Motivation! Let my friendly community bot deliver daily uplifting quotes and heartwarming messages to brighten your day. Whether you need inspiration, a positivity boost, or just a reason to smile, it’s here to make every day better.

Celebrate furry culture and positivity with messages that inspire kindness, growth, and happiness. Together, let’s create a supportive and welcoming atmosphere.

Start your day with a smile or find encouragement when you need it most. Let’s spread joy, one quote at a time!

## Features

- **Daily Motivational Quotes**: Automatically delivered to your server.
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

# Change Log

## Version 1.9.0 Released (on September 10, 2025)

### New Features

- **Reliable Background Jobs:** Switched to reliable background jobs for Discord activity and daily motivation, ensuring consistent delivery.
- **Per-Guild Motivation Timing:** Added per-guild motivation timing and timezone support with sensible defaults for personalized scheduling.
- **Configurable Activity Updates:** Activity update interval is now configurable via DISCORD_ACTIVITY_INTERVAL_MINUTES environment variable.

### Bug Fixes

- **Discord Status Quoting:** Corrected default Discord status quoting for proper display formatting.

### Documentation

- **Prisma Migration Guide:** Added comprehensive Prisma migration comparison guide to assist with database schema changes.
- **Redis Debug Logging:** Documented Redis debug logging configuration in README and .env example for better troubleshooting.

### Chores

- **Redis Client Stability:** Enhanced Redis client stability settings for more reliable connection handling and performance.
- **Docker Configuration Updates:** Updated docker-compose default database name for improved development environment consistency.
- **Database Schema Alignment:** Database migrations to align schema including SuggestionQuote and Guild field updates for better data consistency.

## Version 1.8.0 Released (on September 3, 2025)

### New Features

- **Enhanced Quote Command Embeds:** Improved quote command embeds with author avatar and footer for a more engaging user experience.
- **Updated Invite Link Generation:** Invite links now include all required OAuth scopes for seamless bot integration.

### Documentation

- **Migration Guides:** Added comprehensive Queue and Worker Migration Guides to assist with system transitions.
- **Enhanced README:** Expanded README with detailed development setup instructions, available scripts, and CI pipeline information.

### Refactor

- **Unified Logging System:** Implemented structured logging across API, bot commands, events, and workers for better monitoring and debugging.

### Chores

- **CI Workflow Implementation:** Introduced comprehensive CI workflow with automated tests, security checks, and Docker build verification.
- **ESLint Configuration:** Added ESLint configuration and updated lint/type-check scripts for improved code quality standards.
- **Database Schema Updates:** Updated database schema for suggestions to track updates and simplified field structures.
- **Code Cleanup:** Removed unused queue utility and legacy command logger to streamline the codebase.

## Version 1.7.0 Released (on July 28, 2025)

### New Features

- **Activity Deletion Command:** Added a command to delete user activities.
- **Ephemeral Messages:** Implemented support for ephemeral (private) responses using flags.
- **New Quote Creation Notifications:** Introduced notifications when a new quote is successfully created.

### Improvements & Refinements

- **Database & Cache Stability:** Enhanced pre-pruning checks to ensure the guild cache or database is not empty, preventing potential errors.
- **Task Scheduling:** Adjusted the frequencies of various scheduled tasks.
- **Environment Variable Handling:** Improved validation for environment variables at startup.
- **Quote Management:**
  - Enhanced the quote removal command.
  - Refactored the internal logic for quote creation.
- **Code Quality:** Significant improvements in code readability and consistency across the codebase.
- **Admin Command Experience:** Better handling and more informative error reporting for administrative commands.
- **User Input & Error Handling:** Strengthened input validation and improved error messaging for a smoother user experience.
- **User Feedback:** Updated success messages for setting activities and refined the appearance of suggestion embeds.
- **Internal Logging:** Migrated from basic `console.log` to a more structured and robust logging system.

## Development

### Prerequisites

- Node.js 20.x or 22.x
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
- `pnpm tsc` - Run TypeScript type checking
- `pnpm db:studio` - Open Prisma Studio to view/edit database

### Code Quality

This project uses:

- **ESLint** with TypeScript support for code linting
- **TypeScript** for type safety
- **Prisma** for database management
- **Consola** for centralized logging

The CI pipeline automatically runs:

- TypeScript type checking
- ESLint linting
- Build verification
- Security audits
- Docker build tests

## License

![GitHub license](https://img.shields.io/github/license/MrDemonWolf/fluffboost.svg?style=for-the-badge&logo=github)

## Contact

If you have any questions, suggestions, or feedback, feel free to reach out to us on Discord!

- Discord: [Join my server](https://mrdwolf.com/discord)

Thank you for choosing FluffBoost to add motivation and positivity to your Discord server!

Made with ❤️ by <a href="https://www.mrdemonwolf.com">MrDemonWolf, Inc.</a>
