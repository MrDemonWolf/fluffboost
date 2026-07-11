import { MessageFlags } from "discord.js";
import type { Client, CommandInteraction, User } from "discord.js";
import { eq } from "drizzle-orm";

import { db } from "../database/index.js";
import { suggestionQuotes } from "../database/schema.js";
import type { SuggestionQuote } from "../database/schema.js";
import { buildBrandedEmbed, SUCCESS_COLOR, DANGER_COLOR } from "./embedHelpers.js";
import { sendToMainChannel } from "./mainChannel.js";
import logger from "./logger.js";

/**
 * Load a suggestion that must be in Pending status. Replies ephemerally and
 * returns null if missing or already reviewed.
 */
export async function fetchPendingSuggestion(
  suggestionId: string,
  interaction: CommandInteraction
): Promise<SuggestionQuote | null> {
  const [suggestion] = await db
    .select()
    .from(suggestionQuotes)
    .where(eq(suggestionQuotes.id, suggestionId))
    .limit(1);

  if (!suggestion) {
    await interaction.reply({
      content: `Suggestion with ID ${suggestionId} not found.`,
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }

  if (suggestion.status !== "Pending") {
    await interaction.reply({
      content: `This suggestion has already been ${suggestion.status.toLowerCase()}.`,
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }

  return suggestion;
}

export interface SuggestionReviewNotice {
  status: "Approved" | "Rejected";
  suggestion: SuggestionQuote;
  suggestionId: string;
  reviewer: User;
  reason?: string | null;
}

/**
 * Post the review-result embed to the main channel and DM the submitter.
 * Shared by approve/reject. Entirely best-effort: it runs after the DB write
 * and the ephemeral reply, so a notification failure must never reject the
 * command path and rewrite an already-successful outcome.
 */
export async function notifySuggestionReviewed(
  client: Client,
  { status, suggestion, suggestionId, reviewer, reason }: SuggestionReviewNotice
): Promise<void> {
  const color = status === "Approved" ? SUCCESS_COLOR : DANGER_COLOR;

  const embedFields = [
    { name: "Quote", value: suggestion.quote },
    { name: "Author", value: suggestion.author },
    { name: "Submitted By", value: `<@${suggestion.addedBy}>` },
  ];
  if (reason) {
    embedFields.push({ name: "Reason", value: reason });
  }

  const embed = buildBrandedEmbed({
    title: `Suggestion ${status}`,
    color,
    fields: embedFields,
    footer: `Suggestion ID: ${suggestionId}`,
    timestamp: true,
  }).setAuthor({
    name: reviewer.username,
    iconURL: reviewer.displayAvatarURL(),
  });

  try {
    await sendToMainChannel(client, { embeds: [embed] });
  } catch (err) {
    logger.warn("Discord - Command", `Failed to announce ${status.toLowerCase()} suggestion to main channel`, {
      suggestionId,
      error: err,
    });
  }

  try {
    const submitter = await client.users.fetch(suggestion.addedBy);
    const quoteLines = `**Quote:** ${suggestion.quote}\n**Author:** ${suggestion.author}`;
    const description =
      status === "Approved"
        ? `Your quote suggestion has been approved and added to the motivation quotes!\n\n${quoteLines}`
        : `Your quote suggestion was rejected.\n\n${quoteLines}${reason ? `\n**Reason:** ${reason}` : ""}`;

    await submitter.send({
      embeds: [
        buildBrandedEmbed({
          title: status === "Approved" ? "Your Suggestion Was Approved!" : "Your Suggestion Was Rejected",
          description,
          color,
          timestamp: true,
        }),
      ],
    });
  } catch (err) {
    logger.warn("Discord - Command", `Failed to DM submitter for ${status.toLowerCase()} suggestion`, {
      suggestionId,
      addedBy: suggestion.addedBy,
      error: err,
    });
  }
}
