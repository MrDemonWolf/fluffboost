import {
  Client,
  CommandInteraction,
  EmbedBuilder,
  TextChannel,
  MessageFlags,
} from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";
import env from "../../../utils/env";
import logger from "../../../utils/logger";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
) {
  try {
    logger.commands.executing(
      "admin quote create",
      interaction.user.username,
      interaction.user.id
    );

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) {
      return;
    }

    const quote = options.getString("quote");
    const quoteAuthor = options.getString("quote_author");

    if (!quote) {
      return interaction.reply({
        content: "Please provide a quote",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (!quoteAuthor) {
      return interaction.reply({
        content: "Please provide an author",
        flags: MessageFlags.Ephemeral,
      });
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
      const channel = client.channels.cache.get(
        env.MAIN_CHANNEL_ID
      ) as TextChannel;
      if (channel?.isTextBased()) {
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
    logger.error(
      "Discord - Command",
      "Error executing admin quote create command",
      err,
      {
        user: { username: interaction.user.username, id: interaction.user.id },
        command: "admin quote create",
      }
    );
  }
}
