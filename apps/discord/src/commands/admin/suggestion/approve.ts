import { MessageFlags } from "discord.js";

import type { Client, ChatInputCommandInteraction } from "discord.js";

import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { motivationQuotes } from "../../../database/schema.js";
import { withCommandLogging } from "../../../utils/commandErrors.js";
import { quoteInputError } from "../../../utils/quoteLimits.js";
import {
  fetchPendingSuggestion,
  notifySuggestionReviewed,
  markSuggestionReviewed,
} from "../../../utils/suggestionHelpers.js";

export default async function (
  client: Client,
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await withCommandLogging("admin suggestion approve", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {return;}

    const suggestionId = interaction.options.getString("suggestion_id", true).trim();

    const suggestion = await fetchPendingSuggestion(suggestionId, interaction);
    if (!suggestion) {return;}

    // Suggestions saved before the length limits existed can still be pending;
    // never copy one into the library that delivery would truncate.
    const inputError = quoteInputError(suggestion.quote, suggestion.author);
    if (inputError) {
      await interaction.reply({
        content: `${inputError} Reject this suggestion instead.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Atomic: only proceed if the suggestion is still Pending. Guards against
    // two admins approving concurrently (would double-insert a motivation quote)
    // and against an approve racing a reject (would overwrite Rejected status).
    let approved = false;
    await db.transaction(async (tx) => {
      const claimed = await markSuggestionReviewed(tx, suggestionId, "Approved", interaction.user.id);
      if (!claimed) {return;}
      approved = true;

      await tx.insert(motivationQuotes).values({
        quote: suggestion.quote,
        author: suggestion.author,
        addedBy: suggestion.addedBy,
      });
    });

    if (!approved) {
      await interaction.reply({
        content: "Suggestion is no longer pending — it may have already been reviewed.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Reply before notifications so we never blow the 3-second interaction
    // deadline regardless of main-channel/DM latency.
    await interaction.reply({
      content: `Suggestion ${suggestionId} approved and added to motivation quotes.`,
      flags: MessageFlags.Ephemeral,
    });

    await notifySuggestionReviewed(client, {
      status: "Approved",
      suggestion,
      suggestionId,
      reviewer: interaction.user,
    });
  });
}
