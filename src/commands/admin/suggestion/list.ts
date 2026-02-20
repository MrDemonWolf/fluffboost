import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";
import type { SuggestionQuote } from "../../../generated/prisma/client.js";

import logger from "../../../utils/logger.js";
import { isUserPermitted } from "../../../utils/permissions.js";
import { prisma } from "../../../database/index.js";

export default async function (
  _client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver,
): Promise<void> {
  try {
    logger.commands.executing(
      "admin suggestion list",
      interaction.user.username,
      interaction.user.id,
    );

    const isAllowed = await isUserPermitted(interaction);

    if (!isAllowed) {
      return;
    }

    const status = options.getString("status");

    const where = status ? { status } : {};
    const suggestions = await prisma.suggestionQuote.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    if (suggestions.length === 0) {
      await interaction.reply({
        content: status
          ? `No suggestions found with status: ${status}`
          : "No suggestions found.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let text = "ID - Quote - Author - Status - Submitted By\n";
    suggestions.forEach((s: SuggestionQuote) => {
      text += `${s.id} - ${s.quote} - ${s.author} - ${s.status} - ${s.addedBy}\n`;
    });

    await interaction.reply({
      files: [
        {
          attachment: Buffer.from(text),
          name: "suggestions.txt",
        },
      ],
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "admin suggestion list",
      interaction.user.username,
      interaction.user.id,
    );
  } catch (err) {
    logger.commands.error(
      "admin suggestion list",
      interaction.user.username,
      interaction.user.id,
      err,
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "An error occurred while processing your request.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
