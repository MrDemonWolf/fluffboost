import { Client, CommandInteraction, TextChannel, quote } from "discord.js";
import { info, success, error } from "../../../utils/commandLogger";
import checkAllowedUser from "../../../utils/checkAllowedUser";
import { prisma } from "../../../database";

export default async function (
  client: Client,
  interaction: CommandInteraction
) {
  try {
    info("bot quote list", interaction.user.username, interaction.user.id);

    const isAllowed = checkAllowedUser(interaction);

    if (!isAllowed) return;

    const quotes = await prisma.motivationQuote.findMany();

    if (!quotes)
      return interaction.reply({
        content: "No quotes found. Add some!",
        ephemeral: true,
      });

    // create file txt with all quotes and ids
    let text = "";
    quotes.forEach((quote) => {
      text += `${quote.id} - ${quote.quote}\n`;
    });

    interaction.reply({
      files: [
        {
          attachment: Buffer.from(text, "utf-8"),
          name: "quotes.txt",
        },
      ],
    });

    success("bot quote add", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("bot quote add", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}
