import { Client, CommandInteraction, TextChannel } from "discord.js";
import { info, success, error } from "../../../utils/commandLogger";
import checkAllowedUser from "../../../utils/checkAllowedUser";
import { prisma } from "../../../database";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  quote: string,
  author: string
) {
  try {
    info("bot quote add", interaction.user.username, interaction.user.id);

    const isAllowed = checkAllowedUser(interaction);

    if (!isAllowed) return;

    if (!quote) return interaction.reply("Please provide a quote");
    if (!author) return interaction.reply("Please provide an author");

    // send 10 times
    for (let i = 0; i < 10; i++) {
      await prisma.motivationQuote.create({
        data: {
          quote,
          author,
          addedBy: interaction.user.id,
        },
      });
    }

    const newQuote = await prisma.motivationQuote.create({
      data: {
        quote,
        author,
        addedBy: interaction.user.id,
      },
    });

    // send message to main channel
    const mainChannel = client.channels.cache.get(
      process.env.MAIN_CHANNEL_ID as string
    ) as TextChannel;
    mainChannel?.send(
      `Quote added by ${interaction.user.username} with id: ${newQuote.id}`
    );

    await interaction.reply({
      content: `Quote added with id: ${newQuote.id}`,
      ephemeral: true,
    });
    success("bot quote add", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("bot quote add", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}
