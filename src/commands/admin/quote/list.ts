import { Client, CommandInteraction, TextChannel, quote } from "discord.js";
import { info, success, error } from "../../../utils/commandLogger";
import checkAllowedUser from "../../../utils/checkAllowedUser";
import { prisma } from "../../../database";

export default async function (
  client: Client,
  interaction: CommandInteraction
) {
  try {
    info("admin quote list", interaction.user.username, interaction.user.id);

    const isAllowed = checkAllowedUser(interaction);

    if (!isAllowed) return;

    const quotes = await prisma.motivationQuote.findMany();

    if (!quotes)
      return interaction.reply({
        content: "No quotes found. Add some!",
        ephemeral: true,
      });

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

    success("admin quote add", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("admin quote add", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}
