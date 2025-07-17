import { Client, CommandInteraction } from "discord.js";
import { info, success, error } from "../../../utils/commandLogger";
import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";
import type { MotivationQuote } from "@prisma/client";

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
        ephemeral: true,
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
    });

    success("admin quote add", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("admin quote add", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}
