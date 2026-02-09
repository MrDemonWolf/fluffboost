import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import type { Client, CommandInteraction } from "discord.js";

import logger from "../utils/logger.js";
import posthog from "../utils/posthog.js";
import { isPremiumEnabled, hasEntitlement, getPremiumSkuId } from "../utils/premium.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("premium")
  .setDescription("View premium subscription info and status");

export async function execute(_client: Client, interaction: CommandInteraction) {
  try {
    logger.commands.executing("premium", interaction.user.username, interaction.user.id);

    if (!isPremiumEnabled()) {
      await interaction.reply({
        content: "Premium subscriptions are not currently available.",
        flags: MessageFlags.Ephemeral,
      });

      logger.commands.success("premium", interaction.user.username, interaction.user.id);
      return;
    }

    if (hasEntitlement(interaction)) {
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("Premium Active")
        .setDescription("You have an active premium subscription! Thank you for supporting FluffBoost.")
        .addFields({
          name: "Status",
          value: "Active",
          inline: true,
        })
        .setFooter({ text: "Manage your subscription in User Settings > Subscriptions" });

      await interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    } else {
      const skuId = getPremiumSkuId();

      const embed = new EmbedBuilder()
        .setColor(0xfadb7f)
        .setTitle("FluffBoost Premium")
        .setDescription("Upgrade to Premium to unlock exclusive features!")
        .addFields(
          { name: "Price", value: "$1.99/month", inline: true },
          {
            name: "Benefits",
            value: [
              "- Priority quote delivery",
              "- Exclusive premium quotes",
              "- Early access to new features",
            ].join("\n"),
          }
        )
        .setFooter({ text: "Subscribe to support FluffBoost development!" });

      const components: ActionRowBuilder<ButtonBuilder>[] = [];
      if (skuId) {
        components.push(
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setStyle(ButtonStyle.Premium).setSKUId(skuId)
          )
        );
      }

      await interaction.reply({
        embeds: [embed],
        components,
        flags: MessageFlags.Ephemeral,
      });
    }

    logger.commands.success("premium", interaction.user.username, interaction.user.id);

    posthog.capture({
      distinctId: interaction.user.id,
      event: "premium command used",
      properties: {
        environment: process.env["NODE_ENV"],
        userId: interaction.user.id,
        username: interaction.user.username,
        hasPremium: hasEntitlement(interaction),
      },
    });
  } catch (err) {
    logger.commands.error("premium", interaction.user.username, interaction.user.id, err);
    logger.error("Discord - Command", "Error executing premium command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "premium",
    });

    if (!interaction.replied) {
      await interaction.reply({
        content: "An error occurred while processing your request. Please try again later.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

export default {
  slashCommand,
  execute,
};
