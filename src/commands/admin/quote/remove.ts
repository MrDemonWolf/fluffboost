import {
  Client,
  CommandInteraction,
  MessageFlags,
} from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import { eq } from "drizzle-orm";

import logger from "../../../utils/logger.js";
import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { motivationQuotes } from "../../../database/schema.js";
import { sendToMainChannel } from "../../../utils/mainChannel.js";
import { safeErrorReply } from "../../../utils/commandErrors.js";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
): Promise<void> {
  try {
    logger.commands.executing(
      "admin quote remove",
      interaction.user.username,
      interaction.user.id
    );

    const isAllowed = await isUserPermitted(interaction);

    if (!isAllowed) {
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

    await sendToMainChannel(
      client,
      `Quote deleted by ${interaction.user.username} with id: ${quoteId}`
    );

    await interaction.reply({
      content: `Quote deleted with id: ${quoteId}`,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      `admin quote remove with ${quoteId}`,
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    logger.commands.error(
      "admin quote remove",
      interaction.user.username,
      interaction.user.id,
      err
    );

    await safeErrorReply(interaction);
  }
}
