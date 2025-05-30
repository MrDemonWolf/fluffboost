import { Client, CommandInteraction, TextChannel } from "discord.js";
import { info, success, error } from "../../../utils/commandLogger";
import checkAllowedUser from "../../../utils/checkAllowedUser";
import { prisma } from "../../../database";
import { env } from "../../../utils/env";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  id: string
) {
  try {
    info("admin quote del", interaction.user.username, interaction.user.id);

    const isAllowed = checkAllowedUser(interaction);

    if (!isAllowed) return;

    if (!id) return interaction.reply("Please provide an id");

    const quote = await prisma.motivationQuote.findUnique({
      where: {
        id,
      },
    });
    if (!quote) return interaction.reply(`Quote with id ${id} not found`);

    await prisma.motivationQuote.delete({
      where: {
        id,
      },
    });

    // send message to main channel
    const mainChannel = client.channels.cache.get(
      env.MAIN_CHANNEL_ID as string
    ) as TextChannel;
    mainChannel?.send(
      `Quote deleted by ${interaction.user.username} with id: ${id}`
    );

    await interaction.reply({
      content: `Quote deleted with id: ${id}`,
      ephemeral: true,
    });
    success(
      `admin quote del with ${id} `,
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    error("admin quote del", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}
