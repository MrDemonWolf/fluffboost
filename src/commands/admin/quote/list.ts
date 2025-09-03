import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { MotivationQuote } from "@prisma/client";

import { info, success, error } from "../../../utils/commandLogger";
import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";
import logger from "../../../utils/logger";

export default async function (
  client: Client,
  interaction: CommandInteraction
) {
  try {
    info("admin quote list", interaction.user.username, interaction.user.id);

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) return;

    const quotes = await prisma.motivationQuote.findMany();

    if (quotes.length === 0)
      return interaction.reply({
        content: "No quotes found. Feel free to add some!",
        flags: MessageFlags.Ephemeral,
      });

    let text = "ID - Quote - Author\n";
    quotes.forEach((quote: MotivationQuote) => {
      text += `${quote.id} - ${quote.quote} - ${quote.author}\n`;
    });

    interaction.reply({
      files: [
        {
          attachment: Buffer.from(text),
          name: "quotes.txt",
        },
      ],
      flags: MessageFlags.Ephemeral,
    });

    success("admin quote list", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("admin quote list", interaction.user.username, interaction.user.id);
    logger.error("Command", "Error executing admin quote list command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "admin quote list",
    });
  }
}
