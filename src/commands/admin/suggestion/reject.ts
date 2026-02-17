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
): Promise<any> {
  try {
    logger.commands.executing(
      "admin suggestion reject",
      interaction.user.username,
      interaction.user.id,
    );

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) {
      return;
    }

    const suggestionId = options.getString("suggestion_id", true);
    const reason = options.getString("reason");

    const suggestion = await prisma.suggestionQuote.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion) {
      return await interaction.reply({
        content: `Suggestion with ID ${suggestionId} not found.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    if (suggestion.status !== "Pending") {
      return await interaction.reply({
        content: `This suggestion has already been ${suggestion.status.toLowerCase()}.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await prisma.suggestionQuote.update({
      where: { id: suggestionId },
      data: {
        status: "Rejected",
        reviewedBy: interaction.user.id,
        reviewedAt: new Date(),
      },
    });

    const embedFields = [
      { name: "Quote", value: suggestion.quote },
      { name: "Author", value: suggestion.author },
      { name: "Submitted By", value: `<@${suggestion.addedBy}>` },
    ];

    if (reason) {
      embedFields.push({ name: "Reason", value: reason });
    }

    const embed = new EmbedBuilder()
      .setColor(0xed4245)
      .setTitle("Suggestion Rejected")
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .addFields(embedFields)
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
      const dmDescription = reason
        ? `Your quote suggestion was rejected.\n\n` +
          `**Quote:** ${suggestion.quote}\n**Author:** ${suggestion.author}\n**Reason:** ${reason}`
        : `Your quote suggestion was rejected.\n\n` +
          `**Quote:** ${suggestion.quote}\n**Author:** ${suggestion.author}`;

      await submitter.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle("Your Suggestion Was Rejected")
            .setDescription(dmDescription)
            .setTimestamp(),
        ],
      });
    } catch {
      // DMs may be disabled — this is expected
    }

    await interaction.reply({
      content: `Suggestion ${suggestionId} has been rejected.`,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "admin suggestion reject",
      interaction.user.username,
      interaction.user.id,
    );
  } catch (err) {
    logger.commands.error(
      "admin suggestion reject",
      interaction.user.username,
      interaction.user.id,
      err,
    );
    logger.error(
      "Discord - Command",
      "Error executing admin suggestion reject command",
      err,
      {
        user: { username: interaction.user.username, id: interaction.user.id },
        command: "admin suggestion reject",
      },
    );
  }
  return undefined;
}
