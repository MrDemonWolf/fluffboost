import { MessageFlags } from "discord.js";
import type { CommandInteraction } from "discord.js";
import { eq } from "drizzle-orm";

import { db } from "../database/index.js";
import { suggestionQuotes } from "../database/schema.js";
import type { SuggestionQuote } from "../database/schema.js";

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
