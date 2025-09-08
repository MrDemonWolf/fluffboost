import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

import type { Client, CommandInteraction } from "discord.js";

import logger from "../utils/logger";
import posthog from "../utils/posthog";

export const slashCommand = new SlashCommandBuilder()
  .setName("changelog")
  .setDescription("See the latest changes to the bot");

export function execute(client: Client, interaction: CommandInteraction) {
  try {
    logger.commands.executing(
      "changelog",
      interaction.user.username,
      interaction.user.id,
    );
    const embed = new EmbedBuilder()
      .setColor(0xfadb7f)
      .setTitle("✨ FluffBoost Changelog - Version 1.8.0! ✨")
      .setDescription(
        "Check out the latest enhancements and new features in FluffBoost!",
      )
      .addFields(
        // New Features
        {
          name: "🚀 New Feature: Enhanced Quote Command Embeds",
          value: "Quote embeds now include author avatars and improved footer styling for a more engaging experience!",
        },
        {
          name: "🚀 New Feature: Updated Invite Link Generation",
          value:
            "Invite links now properly include all required OAuth scopes for seamless bot integration.",
        },

        // Documentation
        {
          name: "📚 Documentation: Migration Guides",
          value:
            "Added comprehensive Queue and Worker Migration Guides to help with system transitions.",
        },
        {
          name: "📚 Documentation: Enhanced README",
          value:
            "Expanded README with detailed development setup instructions, available scripts, and CI pipeline details.",
        },

        // Refactor & System Improvements
        {
          name: "⚙️ Refactor: Unified Logging System",
          value:
            "Implemented structured logging across all components including API, bot commands, events, and workers for better monitoring.",
        },
        {
          name: "⚙️ Improved: Database Schema Updates",
          value:
            "Updated database schema for suggestions to track updates and simplified field structures for better performance.",
        },

        // Development & CI Improvements
        {
          name: "🔧 Chores: CI Workflow Implementation",
          value:
            "Introduced comprehensive CI workflow with automated tests, security checks, and Docker build verification.",
        },
        {
          name: "🔧 Chores: ESLint Configuration",
          value:
            "Added ESLint configuration and updated lint/type-check scripts for improved code quality standards.",
        },
        {
          name: "🔧 Chores: Code Cleanup",
          value:
            "Removed unused queue utility and legacy command logger to streamline the codebase and reduce technical debt.",
        },
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
      interaction.user.id,
    );

    posthog.capture({
      distinctId: interaction.user.id,
      event: "changelog command used",
      properties: {
        environment: process.env.NODE_ENV,
        userId: interaction.user.id,
        username: interaction.user.username,
      },
    });
  } catch (err) {
    logger.commands.error(
      "changelog",
      interaction.user.username,
      interaction.user.id,
      err,
    );
    logger.error("Discord - Command", "Error executing changelog command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "changelog",
    });
  }
}

export default {
  slashCommand,
  execute,
};
