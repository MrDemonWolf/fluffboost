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

## Version 1.6.0 Released (on July 17, 2025)

**New Features & Enhancements:**

- **Configurable Bot Status:** The bot's Discord activity status is now configurable and managed, allowing for dynamic and engaging presence messages.
  - Includes a default activity and a development delay for smooth startup.
  - Activities are now fetched from the database for persistent and flexible status management.
  - Activity status updates have been refactored to a dedicated worker for improved efficiency.
- **Enhanced Activity Management:** Added new commands for managing bot activities.
- **Improved Environment Configuration:** Configured default environment variables for easier setup and deployment.

**Improvements & Fixes:**

- **Discord Activity Enum Updates:** Updated internal Discord activity enum values for better compatibility and accuracy.
- **Activity Type Replacement:** Replaced `WATCHING` activity type with `STREAMING` where appropriate for better clarity and Discord's current activity types.
- **Quote Command Clarity:** Renamed quote-related commands for improved clarity and user understanding.

## License

![GitHub license](https://img.shields.io/github/license/MrDemonWolf/fluffboost.svg?style=for-the-badge&logo=github)

## Contact

If you have any questions, suggestions, or feedback, feel free to reach out to us on Discord!

- Discord: [Join my server](https://mrdwolf.com/discord)

Thank you for choosing FluffBoost to add motivation and positivity to your Discord server!

Made with ❤️ by <a href="https://www.mrdemonwolf.com">MrDemonWolf, Inc.</a>
