import { MessageFlags } from "discord.js";

import type { Client, ChatInputCommandInteraction } from "discord.js";

import { eq } from "drizzle-orm";

import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { motivationQuotes } from "../../../database/schema.js";
import { announceToMainChannel } from "../../../utils/mainChannel.js";
import { withCommandLogging } from "../../../utils/commandErrors.js";
import { isUuid } from "../../../utils/quoteLimits.js";

export default async function (
  client: Client,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await withCommandLogging("admin quote remove", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {
      return;
    }

    const quoteId = interaction.options.getString("quote_id", true).trim();

    // Single atomic statement: concurrent removes cannot both report success
    // or post two deletion announcements.
    const [deleted] = isUuid(quoteId)
      ? await db
        .delete(motivationQuotes)
        .where(eq(motivationQuotes.id, quoteId))
        .returning({ id: motivationQuotes.id })
      : [];
    if (!deleted) {
      await interaction.reply({
        content: `Quote with id ${quoteId} not found`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Reply before the main-channel notification: the DB write is committed,
    // and the announce can outlive the 3-second interaction deadline.
    await interaction.reply({
      content: `Quote deleted with id: ${quoteId}`,
      flags: MessageFlags.Ephemeral,
    });

    // Best-effort: the delete already succeeded and the user was told so.
    await announceToMainChannel(
      client,
      `Quote deleted by ${interaction.user.username} with id: ${quoteId}`,
      "Failed to announce quote deletion to main channel",
      { quoteId }
    );
  });
}
