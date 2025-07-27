import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";
import consola from "consola";

import type { Client, CommandInteraction } from "discord.js";

import { info, success, error } from "../utils/commandLogger";
import posthog from "../utils/posthog";

export const slashCommand = new SlashCommandBuilder()
  .setName("changelog")
  .setDescription("See the latest changes to the bot");

export function execute(client: Client, interaction: CommandInteraction) {
  try {
    info("changelog", interaction.user.username, interaction.user.id);
    const embed = new EmbedBuilder()
      .setColor(0xfadb7f)
      .setTitle("✨ FluffBoost Changelog - Version 1.7.0! ✨")
      .setDescription(
        "Check out the latest enhancements and new features in FluffBoost!"
      )
      .addFields(
        // New Features
        {
          name: "🚀 New Feature: Activity Deletion Command",
          value: "You can now delete user activities using a new command!",
        },
        {
          name: "🚀 New Feature: Ephemeral Messages",
          value:
            "Commands can now respond with private messages visible only to you, ensuring less chat clutter.",
        },
        {
          name: "🚀 New Feature: Quote Creation Notifications",
          value:
            "Get notified directly when a new quote is successfully created.",
        },

        // Core System Improvements
        {
          name: "⚙️ Improved: Database & Cache Stability",
          value:
            "Enhanced pre-pruning checks prevent errors if the database or cache is unexpectedly empty.",
        },
        {
          name: "⚙️ Improved: Task Scheduling",
          value:
            "Adjusted the frequencies of various background tasks for better performance.",
        },
        {
          name: "⚙️ Improved: Environment Variable Handling",
          value:
            "Better validation for environment variables at bot startup ensures smoother deployment.",
        },
        {
          name: "⚙️ Improved: Internal Logging",
          value:
            "Switched to a more robust and structured logging system, aiding in better debugging and monitoring.",
        },

        // Command & User Experience Enhancements
        {
          name: "✨ Enhanced: Quote Management",
          value:
            "Both the quote removal command and the internal logic for creating quotes have been improved.",
        },
        {
          name: "✨ Enhanced: Admin Command Handling",
          value:
            "Better management and more informative error reporting for all administrative commands.",
        },
        {
          name: "✨ Enhanced: Input Validation & Error Handling",
          value:
            "Significant improvements to how user input is validated, leading to clearer error messages for you.",
        },
        {
          name: "✨ Enhanced: User Feedback",
          value:
            "Updated success messages for setting activities and refined the visual appearance of suggestion embeds.",
        },
        {
          name: "✨ Enhanced: Code Quality",
          value:
            "General improvements in code readability and consistency across the entire bot's codebase.",
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

    success("changelog", interaction.user.username, interaction.user.id);

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
    error("changelog", interaction.user.username, interaction.user.id);
    consola.error(err);
  }
}

export default {
  slashCommand,
  execute,
};
