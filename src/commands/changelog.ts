import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

import type { Client, CommandInteraction } from "discord.js";

import logger from "../utils/logger.js";
import posthog from "../utils/posthog.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("changelog")
  .setDescription("See the latest changes to the bot");

export async function execute(_client: Client, interaction: CommandInteraction) {
  try {
    logger.commands.executing(
      "changelog",
      interaction.user.username,
      interaction.user.id
    );
    const embed = new EmbedBuilder()
      .setColor(0xfadb7f)
      .setTitle("✨ FluffBoost Changelog - Version 2.0.0! ✨")
      .setDescription(
        "Major upgrade with Prisma 7 and improved API endpoints!"
      )
      .addFields(
        // Major Upgrades
        {
          name: "🚀 Major: Prisma 7 Upgrade",
          value:
            "Upgraded to Prisma 7 with enhanced TypeScript support and improved performance!",
        },
        {
          name: "🔄 Updated: Health Check API",
          value:
            "Renamed status API endpoint from /status to /api/health for better REST conventions.",
        },

        // New Features
        {
          name: "🚀 New Feature: Reliable Background Jobs",
          value:
            "Switched to reliable background jobs for Discord activity and daily motivation, ensuring consistent delivery!",
        },
        {
          name: "🚀 New Feature: Per-Guild Motivation Timing",
          value:
            "Added per-guild motivation timing and timezone support with sensible defaults for personalized scheduling.",
        },
        {
          name: "✨ New Feature: Configurable Activity Updates",
          value:
            "Activity update interval is now configurable via DISCORD_ACTIVITY_INTERVAL_MINUTES environment variable.",
        },

        // Bug Fixes
        {
          name: "🐛 Bug Fix: Discord Status Quoting",
          value:
            "Corrected default Discord status quoting for proper display formatting.",
        },

        // Documentation
        {
          name: "📚 Documentation: Prisma Migration Guide",
          value:
            "Added comprehensive Prisma migration comparison guide to assist with database schema changes.",
        },
        {
          name: "�� Documentation: Redis Debug Logging",
          value:
            "Documented Redis debug logging configuration in README and .env example for better troubleshooting.",
        },

        // System Improvements
        {
          name: "⚙️ Improved: Redis Client Stability",
          value:
            "Enhanced Redis client stability settings for more reliable connection handling and performance.",
        },
        {
          name: "⚙️ Improved: Database Schema Alignment",
          value:
            "Database migrations to align schema including SuggestionQuote and Guild field updates for better data consistency.",
        },

        // Development Improvements
        {
          name: "🔧 Chores: Docker Configuration Updates",
          value:
            "Updated docker-compose default database name for improved development environment consistency.",
        }
      )
      .setTimestamp()
      .setFooter({
        text: "Powered by MrDemonWolf, Inc.",
      });

    interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "changelog",
      interaction.user.username,
      interaction.user.id
    );

    posthog.capture({
      distinctId: interaction.user.id,
      event: "changelog command used",
      properties: {
        environment: process.env["NODE_ENV"],
        userId: interaction.user.id,
        username: interaction.user.username,
      },
    });
  } catch (err) {
    logger.commands.error(
      "changelog",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error(
      "Discord - Command",
      "Error executing changelog command",
      err,
      {
        user: { username: interaction.user.username, id: interaction.user.id },
        command: "changelog",
      }
    );
  }
}

export default {
  slashCommand,
  execute,
};
