# Change Log

All notable changes to FluffBoost will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-12-25

### Major Upgrades

- **Prisma 7:** Upgraded to Prisma 7 with enhanced TypeScript support and improved performance!
- **Health Check API:** Renamed status API endpoint from /status to /api/health for better REST conventions.
- **Optimized Docker Builds:** Enhanced Dockerfile with better layer caching and multi-stage builds for significantly faster build times!

### Added

- Reliable Background Jobs: Switched to reliable background jobs for Discord activity and daily motivation, ensuring consistent delivery.
- Per-Guild Motivation Timing: Added per-guild motivation timing and timezone support with sensible defaults for personalized scheduling.
- Configurable Activity Updates: Activity update interval is now configurable via DISCORD_ACTIVITY_INTERVAL_MINUTES environment variable.

### Fixed

- Discord Status Quoting: Corrected default Discord status quoting for proper display formatting.

### Documentation

- Prisma Migration Guide: Added comprehensive Prisma migration comparison guide to assist with database schema changes.
- Redis Debug Logging: Documented Redis debug logging configuration in README and .env example for better troubleshooting.

### Changed

- Redis Client Stability: Enhanced Redis client stability settings for more reliable connection handling and performance.
- Docker Configuration Updates: Updated docker-compose default database name for improved development environment consistency.
- Database Schema Alignment: Database migrations to align schema including SuggestionQuote and Guild field updates for better data consistency.

## [1.9.0] - 2025-09-10

### Added

- Reliable Background Jobs: Switched to reliable background jobs for Discord activity and daily motivation, ensuring consistent delivery.
- Per-Guild Motivation Timing: Added per-guild motivation timing and timezone support with sensible defaults for personalized scheduling.
- Configurable Activity Updates: Activity update interval is now configurable via DISCORD_ACTIVITY_INTERVAL_MINUTES environment variable.

### Fixed

- Discord Status Quoting: Corrected default Discord status quoting for proper display formatting.

### Documentation

- Prisma Migration Guide: Added comprehensive Prisma migration comparison guide to assist with database schema changes.
- Redis Debug Logging: Documented Redis debug logging configuration in README and .env example for better troubleshooting.

### Changed

- Redis Client Stability: Enhanced Redis client stability settings for more reliable connection handling and performance.
- Docker Configuration Updates: Updated docker-compose default database name for improved development environment consistency.
- Database Schema Alignment: Database migrations to align schema including SuggestionQuote and Guild field updates for better data consistency.

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
