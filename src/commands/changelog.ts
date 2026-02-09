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
      .setTitle("\u2728 FluffBoost Changelog - Version 2.1.0! \u2728")
      .setDescription(
        "Premium subscriptions, new owner commands, and monetization support!"
      )
      .addFields(
        // New Features
        {
          name: "\uD83D\uDE80 New Feature: Premium Subscriptions",
          value:
            "Added `/premium` command for users to view premium info, check subscription status, and subscribe via Discord's native purchase flow.",
        },
        {
          name: "\uD83D\uDE80 New Feature: Owner Commands",
          value:
            "Added `/owner` command restricted to the bot owner. Includes `/owner premium test-create` and `/owner premium test-delete` for managing Discord test entitlements.",
        },
        {
          name: "\u2728 New Feature: Entitlement Event Tracking",
          value:
            "Bot now listens for subscription events (create, update, delete) with logging and PostHog analytics tracking.",
        },
        {
          name: "\u2728 New Feature: Premium Toggle",
          value:
            "Premium features can be enabled/disabled via `PREMIUM_ENABLED` environment variable with SKU ID configuration.",
        },

        // System Improvements
        {
          name: "\u2699\uFE0F Improved: Environment Validation",
          value:
            "Added cross-field validation ensuring `DISCORD_PREMIUM_SKU_ID` is set when `PREMIUM_ENABLED` is true.",
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
