import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import { eq } from "drizzle-orm";

import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { motivationQuotes } from "../../../database/schema.js";
import logger from "../../../utils/logger.js";
import { sendToMainChannel } from "../../../utils/mainChannel.js";
import { withCommandLogging } from "../../../utils/commandErrors.js";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
): Promise<void> {
  await withCommandLogging("admin quote remove", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {
      return;
    }

    const quoteId = options.getString("quote_id", true);

    const [quote] = await db
      .select()
      .from(motivationQuotes)
      .where(eq(motivationQuotes.id, quoteId))
      .limit(1);
    if (!quote) {
      await interaction.reply({
        content: `Quote with id ${quoteId} not found`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await db.delete(motivationQuotes).where(eq(motivationQuotes.id, quoteId));

    // Reply before the main-channel notification: the DB write is committed,
    // and the announce can outlive the 3-second interaction deadline.
    await interaction.reply({
      content: `Quote deleted with id: ${quoteId}`,
      flags: MessageFlags.Ephemeral,
    });

    // Best-effort: the delete already succeeded and the user was told so.
    try {
      await sendToMainChannel(
        client,
        `Quote deleted by ${interaction.user.username} with id: ${quoteId}`
      );
    } catch (err) {
      logger.warn("Discord - Command", "Failed to announce quote deletion to main channel", {
        quoteId,
        error: err,
      });
    }
  });
}
