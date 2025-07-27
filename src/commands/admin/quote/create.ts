import {
  Client,
  CommandInteraction,
  EmbedBuilder,
  TextChannel,
  MessageFlags,
} from "discord.js";
import consola from "consola";

import type { CommandInteractionOptionResolver } from "discord.js";

import { info, success, error } from "../../../utils/commandLogger";
import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";
import env from "../../../utils/env";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
) {
  try {
    info("admin quote create", interaction.user.username, interaction.user.id);

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) return;

    const quote = options.getString("quote");
    const quoteAuthor = options.getString("quote_author");

    if (!quote) return interaction.reply("Please provide a quote");
    if (!quoteAuthor) return interaction.reply("Please provide an author");

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
      const channel = client.channels.cache.get(env.MAIN_CHANNEL_ID);
      if (channel?.isTextBased()) {
        await channel.send({ embeds: [embed] });
      } else {
        consola.warn(
          `Main channel not found or not text-based. ID: ${env.MAIN_CHANNEL_ID}`
        );
      }
    } else {
      consola.warn("MAIN_CHANNEL_ID not configured");
    }

    await interaction.reply({
      content: `Quote created with id: ${newQuote.id}`,
      flags: MessageFlags.Ephemeral,
    });

    success(
      "admin quote create",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    error("admin quote create", interaction.user.username, interaction.user.id);
    consola.error({
      message: `[Admin Quote Create Command] Error executing command: ${err}`,
      badge: true,
      timestamp: new Date(),
    });
  }
}
