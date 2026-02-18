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
  options: CommandInteractionOptionResolver,
): Promise<void> {
  try {
    logger.commands.executing(
      "admin suggestion approve",
      interaction.user.username,
      interaction.user.id,
    );

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) {
      return;
    }

    const suggestionId = options.getString("suggestion_id", true);

    const suggestion = await prisma.suggestionQuote.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion) {
      await interaction.reply({
        content: `Suggestion with ID ${suggestionId} not found.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (suggestion.status !== "Pending") {
      await interaction.reply({
        content: `This suggestion has already been ${suggestion.status.toLowerCase()}.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await prisma.$transaction([
      prisma.motivationQuote.create({
        data: {
          quote: suggestion.quote,
          author: suggestion.author,
          addedBy: suggestion.addedBy,
        },
      }),
      prisma.suggestionQuote.update({
        where: { id: suggestionId },
        data: {
          status: "Approved",
          reviewedBy: interaction.user.id,
          reviewedAt: new Date(),
        },
      }),
    ]);

    const embed = new EmbedBuilder()
      .setColor(0x57f287)
      .setTitle("Suggestion Approved")
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .addFields(
        { name: "Quote", value: suggestion.quote },
        { name: "Author", value: suggestion.author },
        { name: "Submitted By", value: `<@${suggestion.addedBy}>` },
      )
      .setFooter({ text: `Suggestion ID: ${suggestionId}` })
      .setTimestamp();

    if (env.MAIN_CHANNEL_ID) {
      const channel = await client.channels.fetch(env.MAIN_CHANNEL_ID);
      if (channel?.isTextBased() && !channel.isDMBased()) {
        await channel.send({ embeds: [embed] });
      }
    }

    try {
      const submitter = await client.users.fetch(suggestion.addedBy);
      await submitter.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle("Your Suggestion Was Approved!")
            .setDescription(
              `Your quote suggestion has been approved and added to the motivation quotes!\n\n` +
                `**Quote:** ${suggestion.quote}\n**Author:** ${suggestion.author}`,
            )
            .setTimestamp(),
        ],
      });
    } catch (err) {
      logger.warn("Discord - Command", "Failed to DM submitter for approved suggestion", {
        suggestionId,
        addedBy: suggestion.addedBy,
        error: err,
      });
    }

    await interaction.reply({
      content: `Suggestion ${suggestionId} approved and added to motivation quotes.`,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "admin suggestion approve",
      interaction.user.username,
      interaction.user.id,
    );
  } catch (err) {
    logger.commands.error(
      "admin suggestion approve",
      interaction.user.username,
      interaction.user.id,
      err,
    );
    logger.error(
      "Discord - Command",
      "Error executing admin suggestion approve command",
      err,
      {
        user: { username: interaction.user.username, id: interaction.user.id },
        command: "admin suggestion approve",
      },
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "An error occurred while processing your request.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
