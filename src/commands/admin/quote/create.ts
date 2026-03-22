import {
  Client,
  CommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { motivationQuotes } from "../../../database/schema.js";
import logger from "../../../utils/logger.js";
import { sendToMainChannel } from "../../../utils/mainChannel.js";
import { safeErrorReply } from "../../../utils/commandErrors.js";

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

    const [newQuote] = await db
      .insert(motivationQuotes)
      .values({
        quote,
        author: quoteAuthor,
        addedBy: interaction.user.id,
      })
      .returning();

    if (!newQuote) {
      return;
    }

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

    await sendToMainChannel(client, { embeds: [embed] });

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

    await safeErrorReply(interaction);
  }
}
