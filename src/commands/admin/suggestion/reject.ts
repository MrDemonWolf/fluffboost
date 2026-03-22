import {
  Client,
  CommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import { eq, and } from "drizzle-orm";

import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { suggestionQuotes } from "../../../database/schema.js";
import logger from "../../../utils/logger.js";
import { sendToMainChannel } from "../../../utils/mainChannel.js";
import { safeErrorReply } from "../../../utils/commandErrors.js";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver,
): Promise<void> {
  try {
    logger.commands.executing(
      "admin suggestion reject",
      interaction.user.username,
      interaction.user.id,
    );

    const isAllowed = await isUserPermitted(interaction);

    if (!isAllowed) {
      return;
    }

    const suggestionId = options.getString("suggestion_id", true);
    const reason = options.getString("reason");

    const result = await db
      .update(suggestionQuotes)
      .set({
        status: "Rejected",
        reviewedBy: interaction.user.id,
        reviewedAt: new Date(),
      })
      .where(and(eq(suggestionQuotes.id, suggestionId), eq(suggestionQuotes.status, "Pending")))
      .returning();

    if (result.length === 0) {
      const [existing] = await db
        .select()
        .from(suggestionQuotes)
        .where(eq(suggestionQuotes.id, suggestionId))
        .limit(1);

      if (!existing) {
        await interaction.reply({
          content: `Suggestion with ID ${suggestionId} not found.`,
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await interaction.reply({
          content: `This suggestion has already been ${existing.status.toLowerCase()}.`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return;
    }

    const [suggestion] = await db
      .select()
      .from(suggestionQuotes)
      .where(eq(suggestionQuotes.id, suggestionId))
      .limit(1);

    if (!suggestion) {
      return;
    }

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

    await sendToMainChannel(client, { embeds: [embed] });

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
    } catch (err) {
      logger.warn("Discord - Command", "Failed to DM submitter for rejected suggestion", {
        suggestionId,
        addedBy: suggestion.addedBy,
        error: err,
      });
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

    await safeErrorReply(interaction);
  }
}
