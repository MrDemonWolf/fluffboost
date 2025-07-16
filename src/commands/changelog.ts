import type { Client, CommandInteraction } from "discord.js";

import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

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
      .setTitle("Changelog")
      .setDescription("Here are the latest changes to the bot:")
      .addFields(
        {
          name: "🚀 Version 1.5.0 Released! (July 10, 2025)",
          value:
            "A significant update bringing new features and stability improvements.",
        },
        {
          name: "✨ Database Migration Enhancements",
          value:
            "Streamlined database migration with new entrypoint scripts, an `npm run db:migrate` command, and integrated migration directly into the Dockerfile. Plus, the core database schema has been initialized.",
        },
        {
          name: "✨ Executable Entrypoint Script",
          value:
            "The main entrypoint script is now executable for easier deployment and use.",
        },
        {
          name: "🛠️ Refactoring & Code Clarity",
          value:
            "Extensive refactoring of suggestion quote relations, guild database management, permissions, and overall code for improved clarity and maintainability.",
        },
        {
          name: "⚙️ Configuration & Dependency Updates",
          value:
            "Updated dependencies and project configuration for better performance and stability.",
        },
        {
          name: "🐛 Bug Fixes & Optimizations",
          value:
            "Addressed incorrect field names in database queries, replaced baseline migration and the old database migration tool, and removed extraneous whitespace. Also reverted a previous `motivationChannelId` column rename.",
        },
        {
          name: "♻️ Renames for Consistency",
          value:
            "The motivation channel column and various other elements have been renamed for better consistency.",
        },
        {
          name: "🔄 Branch Merges",
          value:
            "The `dev` branch has been merged, incorporating all the latest developments.",
        }
      )
      .setTimestamp()
      .setFooter({
        text: "Powered by MrDemonWolf, Inc.",
      });

    interaction.reply({
      embeds: [embed],
      ephemeral: true,
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
