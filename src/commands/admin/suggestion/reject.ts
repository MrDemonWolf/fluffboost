import { EmbedBuilder, MessageFlags } from "discord.js";

import type { Client, CommandInteraction, CommandInteractionOptionResolver } from "discord.js";

import { eq } from "drizzle-orm";

import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { suggestionQuotes } from "../../../database/schema.js";
import logger from "../../../utils/logger.js";
import { sendToMainChannel } from "../../../utils/mainChannel.js";
import { withCommandLogging } from "../../../utils/commandErrors.js";
import { fetchPendingSuggestion } from "../../../utils/suggestionHelpers.js";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver,
): Promise<void> {
  await withCommandLogging("admin suggestion reject", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {return;}

    const suggestionId = options.getString("suggestion_id", true);
    const reason = options.getString("reason");

    const suggestion = await fetchPendingSuggestion(suggestionId, interaction);
    if (!suggestion) {return;}

    await db
      .update(suggestionQuotes)
      .set({
        status: "Rejected",
        reviewedBy: interaction.user.id,
        reviewedAt: new Date(),
      })
      .where(eq(suggestionQuotes.id, suggestionId));

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
  });
}
