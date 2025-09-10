import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { MotivationQuote } from "@prisma/client";

import logger from "../../../utils/logger";
import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";

export default async function (
  client: Client,
  interaction: CommandInteraction
) {
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

    const quotes = await prisma.motivationQuote.findMany();

    if (quotes.length === 0) {
      return await interaction.reply({
        content: "No quotes found. Feel free to add some!",
        flags: MessageFlags.Ephemeral,
      });
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
  }
}
