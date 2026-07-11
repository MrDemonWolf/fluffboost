import { MessageFlags } from "discord.js";

import type { Client, CommandInteraction, CommandInteractionOptionResolver } from "discord.js";

import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { withCommandLogging } from "../../../utils/commandErrors.js";
import {
  fetchPendingSuggestion,
  notifySuggestionReviewed,
  markSuggestionReviewed,
} from "../../../utils/suggestionHelpers.js";

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
    const claimed = await markSuggestionReviewed(db, suggestionId, "Rejected", interaction.user.id);

    if (!claimed) {
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
