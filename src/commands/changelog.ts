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
      .setTitle("FluffBoost Changelog - v2.2.0")
      .setDescription("Premium subscriptions and custom quote scheduling are here!")
      .addFields(
        {
          name: "Premium Subscriptions",
          value:
            "FluffBoost now offers premium subscriptions! " +
            "Use `/premium` to view subscription info and unlock premium features for your server.",
        },
        {
          name: "Custom Quote Scheduling (Premium)",
          value:
            "Premium servers can customize their quote delivery with `/setup schedule`.\n" +
            "- Choose **daily**, **weekly**, or **monthly** delivery\n" +
            "- Pick your preferred **time** and **timezone**\n" +
            "- Select which **day** for weekly or monthly schedules",
        },
        {
          name: "Per-Server Schedules",
          value:
            "Every server now has its own independent quote schedule. " +
            "Free servers keep the default daily 8:00 AM (America/Chicago) delivery.",
        },
        {
          name: "New Commands",
          value:
            "`/premium` - View your premium subscription status\n" +
            "`/setup schedule` - Customize quote delivery (premium)\n" +
            "`/owner premium test-create` - Create a test entitlement (owner only)\n" +
            "`/owner premium test-delete` - Delete a test entitlement (owner only)",
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
