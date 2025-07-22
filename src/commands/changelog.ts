import type { Client, CommandInteraction } from "discord.js";

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from "discord.js";

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
      .setTitle("✨ FluffBoost Changelog - Version 1.6.0! ✨")
      .setDescription(
        "A fresh update focusing on dynamic bot status, better activity management, and internal refinements to keep things running smoothly!"
      )
      .addFields(
        {
          name: "🚀 Dynamic Bot Status & Activity Management",
          value:
            "The bot's Discord activity status is now fully configurable and dynamic! This includes a new system for managing activities from the database, efficient updates via a dedicated worker, and new commands to help manage these activities. Expect a more lively presence!",
        },
        {
          name: "⚙️ Core System Enhancements",
          value:
            "We've refined default environment variables for easier setup and deployment, and updated internal Discord activity enum values for greater accuracy and compatibility.",
        },
        {
          name: "🛠️ Command & Type Refinements",
          value:
            "Quote-related commands have been renamed for improved clarity, and activity types have been updated (e.g., replacing `WATCHING` with `STREAMING`) to align with Discord's current standards.",
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
    console.log(err);
  }
}

export default {
  slashCommand,
  execute,
};
