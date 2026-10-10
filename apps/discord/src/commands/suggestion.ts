import { InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";

import type { Client, ChatInputCommandInteraction } from "discord.js";

import { eq } from "drizzle-orm";

import { db } from "../database/index.js";
import { guilds, suggestionQuotes, type SuggestionQuote } from "../database/schema.js";
import { announceToMainChannel } from "../utils/mainChannel.js";
import { withCommandLogging } from "../utils/commandErrors.js";
import { requireGuildId } from "../utils/permissions.js";
import { buildBrandedEmbed, escapeFieldValue } from "../utils/embedHelpers.js";
import { MAX_QUOTE_LENGTH, MAX_QUOTE_AUTHOR_LENGTH, quoteInputError } from "../utils/quoteLimits.js";
import {
  consumeSuggestionSlot,
  MAX_SUGGESTIONS_PER_USER_PER_DAY,
  releaseSuggestionSlot,
} from "../utils/suggestionLimits.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("suggestion")
  .setDescription(
    "Suggest a quote for the FluffBoost team to review"
  )
  // Submissions are tied to a set-up server; hides the command from bot DMs.
  .setContexts(InteractionContextType.Guild)
  .addStringOption((option) =>
    option
      .setName("quote")
      .setDescription("The quote to be suggested")
      .setMinLength(1)
      .setMaxLength(MAX_QUOTE_LENGTH)
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("author")
      .setDescription("The author of the quote")
      .setMinLength(1)
      .setMaxLength(MAX_QUOTE_AUTHOR_LENGTH)
      .setRequired(true)
  );

export async function execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
  await withCommandLogging("suggestion", interaction, async () => {
    // Both options are required in the command schema.
    const quote = interaction.options.getString("quote", true);
    const author = interaction.options.getString("author", true);

    const inputError = quoteInputError(quote, author);
    if (inputError) {
      await interaction.reply({ content: inputError, flags: MessageFlags.Ephemeral });
      return;
    }
    const guildId = await requireGuildId(interaction);
    if (!guildId) {
      return;
    }

    // Acknowledge before the DB and Redis round trips: a slow pool must not
    // expire the interaction after the quota slot and row are already spent.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    /**
     * Get the guild from the database
     * Check if the guild is setup
     * If not, return an error message
     */
    const [guild] = await db
      .select()
      .from(guilds)
      .where(eq(guilds.guildId, guildId))
      .limit(1);

    if (!guild) {
      await interaction.editReply({
        content: "FluffBoost is not set up in this server yet. Ask a server admin to run `/setup channel` first.",
      });
      return;
    }

    const canSubmit = await consumeSuggestionSlot(interaction.user.id, interaction.id);
    if (!canSubmit) {
      await interaction.editReply({
        content:
          `You can submit up to ${MAX_SUGGESTIONS_PER_USER_PER_DAY} quote suggestions every 24 hours. ` +
          "Please try again later.",
      });
      return;
    }

    let newQuote: SuggestionQuote | undefined;
    try {
      [newQuote] = await db
        .insert(suggestionQuotes)
        .values({
          quote,
          author,
          addedBy: interaction.user.id,
          status: "Pending",
        })
        .returning();
    } catch (insertError) {
      try {
        await releaseSuggestionSlot(interaction.user.id, interaction.id);
      } catch (releaseError) {
        throw new AggregateError(
          [insertError, releaseError],
          "Suggestion insert failed and its quota reservation could not be released",
        );
      }
      throw insertError;
    }

    if (!newQuote) {
      await releaseSuggestionSlot(interaction.user.id, interaction.id);
      await interaction.editReply({
        content: "Your suggestion could not be saved. Please try again.",
      });
      return;
    }

    await interaction.editReply({
      content:
        "Thanks! The FluffBoost team will review your suggestion. If it is approved, it may be posted " +
        "in any server using FluffBoost, credited with your Discord username and avatar.",
    });

    /**
     * Send the quote suggestion to the main channel for review
     */
    const embed = buildBrandedEmbed({
      title: "New Quote Suggestion",
      fields: [
        // Staff-facing: show the submitted text literally (masked links included).
        { name: "Quote", value: escapeFieldValue(quote) },
        { name: "Quote Author", value: escapeFieldValue(author) },
        { name: "Status", value: newQuote.status },
      ],
      footer: `Created with ID ${newQuote.id}`,
      timestamp: true,
    }).setAuthor({
      name: interaction.user.username,
      iconURL: interaction.user.displayAvatarURL(),
    });

    // Best-effort: the suggestion is saved and the user was told so.
    await announceToMainChannel(
      client,
      { embeds: [embed] },
      "Failed to announce suggestion to main channel",
      { suggestionId: newQuote.id }
    );
  });
}

export default {
  slashCommand,
  execute,
};
