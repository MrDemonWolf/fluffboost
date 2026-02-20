import {
  Client,
  CommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import { isUserPermitted } from "../../../utils/permissions.js";
import { prisma } from "../../../database/index.js";
import env from "../../../utils/env.js";
import logger from "../../../utils/logger.js";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
): Promise<void> {
  try {
    logger.commands.executing(
      "admin quote create",
      interaction.user.username,
      interaction.user.id
    );

    const isAllowed = await isUserPermitted(interaction);

    if (!isAllowed) {
      return;
    }

    const quote = options.getString("quote");
    const quoteAuthor = options.getString("quote_author");

    if (!quote) {
      await interaction.reply({
        content: "Please provide a quote",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!quoteAuthor) {
      await interaction.reply({
        content: "Please provide an author",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const newQuote = await prisma.motivationQuote.create({
      data: {
        quote,
        author: quoteAuthor,
        addedBy: interaction.user.id,
      },
    });

    /**
     * Send a message to the main channelof the owner guild
     * to notify that a new quote has been added.
     * This is useful for tracking purposes and to keep the owner informed.
     */
    const embed = new EmbedBuilder()
      .setColor(0xfadb7f)
      .setTitle("New Quote Created")
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .addFields(
        { name: "Quote", value: newQuote.quote },
        { name: "Author", value: newQuote.author }
      )
      .setFooter({
        text: `Quote ID: ${newQuote.id}`,
      })
      .setTimestamp();

    if (env.MAIN_CHANNEL_ID) {
      const channel = await client.channels.fetch(env.MAIN_CHANNEL_ID);
      if (channel?.isTextBased() && !channel.isDMBased()) {
        await channel.send({ embeds: [embed] });
      } else {
        logger.warn("Admin", "Main channel not found or not text-based", {
          channelId: env.MAIN_CHANNEL_ID,
        });
      }
    } else {
      logger.warn("Admin", "MAIN_CHANNEL_ID not configured");
    }

    await interaction.reply({
      content: `Quote created with id: ${newQuote.id}`,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "admin quote create",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    logger.commands.error(
      "admin quote create",
      interaction.user.username,
      interaction.user.id,
      err
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "An error occurred while processing your request.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
