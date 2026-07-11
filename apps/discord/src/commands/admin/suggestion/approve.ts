import { MessageFlags } from "discord.js";

import type { Client, CommandInteraction, CommandInteractionOptionResolver } from "discord.js";

import { and, eq } from "drizzle-orm";

import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { motivationQuotes, suggestionQuotes } from "../../../database/schema.js";
import { withCommandLogging } from "../../../utils/commandErrors.js";
import { fetchPendingSuggestion, notifySuggestionReviewed } from "../../../utils/suggestionHelpers.js";

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

    // Atomic: only proceed if the suggestion is still Pending. Guards against
    // two admins approving concurrently (would double-insert a motivation quote)
    // and against an approve racing a reject (would overwrite Rejected status).
    let approved = false;
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(suggestionQuotes)
        .set({
          status: "Approved",
          reviewedBy: interaction.user.id,
          reviewedAt: new Date(),
        })
        .where(and(eq(suggestionQuotes.id, suggestionId), eq(suggestionQuotes.status, "Pending")))
        .returning({ id: suggestionQuotes.id });

      if (!updated) {return;}
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
