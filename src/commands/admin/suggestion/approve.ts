import { EmbedBuilder, MessageFlags } from "discord.js";

import type { Client, CommandInteraction, CommandInteractionOptionResolver } from "discord.js";

import { eq } from "drizzle-orm";

import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { motivationQuotes, suggestionQuotes } from "../../../database/schema.js";
import logger from "../../../utils/logger.js";
import { sendToMainChannel } from "../../../utils/mainChannel.js";
import { withCommandLogging } from "../../../utils/commandErrors.js";
import { fetchPendingSuggestion } from "../../../utils/suggestionHelpers.js";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver,
): Promise<void> {
  await withCommandLogging("admin suggestion approve", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {return;}

    const suggestionId = options.getString("suggestion_id", true);

    const suggestion = await fetchPendingSuggestion(suggestionId, interaction);
    if (!suggestion) {return;}

    await db.transaction(async (tx) => {
      await tx.insert(motivationQuotes).values({
        quote: suggestion.quote,
        author: suggestion.author,
        addedBy: suggestion.addedBy,
      });
      await tx
        .update(suggestionQuotes)
        .set({
          status: "Approved",
          reviewedBy: interaction.user.id,
          reviewedAt: new Date(),
        })
        .where(eq(suggestionQuotes.id, suggestionId));
    });

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

    await sendToMainChannel(client, { embeds: [embed] });

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
  });
}
