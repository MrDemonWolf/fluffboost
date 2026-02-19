import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { MotivationQuote } from "../../../generated/prisma/client.js";

import logger from "../../../utils/logger.js";
import { isUserPermitted } from "../../../utils/permissions.js";
import { prisma } from "../../../database/index.js";

export default async function (
  _client: Client,
  interaction: CommandInteraction
): Promise<void> {
  try {
    logger.commands.executing(
      "admin quote list",
      interaction.user.username,
      interaction.user.id
    );

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) {
      return;
    }

    const quotes = await prisma.motivationQuote.findMany({
      orderBy: { createdAt: "desc" },
    });

    if (quotes.length === 0) {
      await interaction.reply({
        content: "No quotes found. Feel free to add some!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let text = "ID - Quote - Author\n";
    quotes.forEach((quote: MotivationQuote) => {
      text += `${quote.id} - ${quote.quote} - ${quote.author}\n`;
    });

    await interaction.reply({
      files: [
        {
          attachment: Buffer.from(text),
          name: "quotes.txt",
        },
      ],
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "admin quote list",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    logger.commands.error(
      "admin quote list",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error(
      "Discord - Command",
      "Error executing admin quote list command",
      err,
      {
        user: { username: interaction.user.username, id: interaction.user.id },
        command: "admin quote list",
      }
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "An error occurred while processing your request.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
