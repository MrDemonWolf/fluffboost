import { MessageFlags } from "discord.js";

import type { Client, CommandInteraction, CommandInteractionOptionResolver } from "discord.js";

import { and, eq } from "drizzle-orm";

import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { suggestionQuotes } from "../../../database/schema.js";
import { withCommandLogging } from "../../../utils/commandErrors.js";
import { fetchPendingSuggestion, notifySuggestionReviewed } from "../../../utils/suggestionHelpers.js";

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

    // Atomic conditional UPDATE so two concurrent rejects can't both proceed
    // to post the embed + DM + reply.
    const updated = await db
      .update(suggestionQuotes)
      .set({
        status: "Rejected",
        reviewedBy: interaction.user.id,
        reviewedAt: new Date(),
      })
      .where(and(eq(suggestionQuotes.id, suggestionId), eq(suggestionQuotes.status, "Pending")))
      .returning({ id: suggestionQuotes.id });

    if (updated.length === 0) {
      await interaction.reply({
        content: "This suggestion was just reviewed by someone else.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Reply before notifications so we never blow the 3-second interaction
    // deadline regardless of main-channel/DM latency.
    await interaction.reply({
      content: `Suggestion ${suggestionId} has been rejected.`,
      flags: MessageFlags.Ephemeral,
    });

    await notifySuggestionReviewed(client, {
      status: "Rejected",
      suggestion,
      suggestionId,
      reviewer: interaction.user,
      reason,
    });
  });
}
