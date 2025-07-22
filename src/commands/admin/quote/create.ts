import {
  Client,
  CommandInteraction,
  TextChannel,
  MessageFlags,
} from "discord.js";
import { info, success, error } from "../../../utils/commandLogger";
import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";
import { env } from "../../../utils/env";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  quote: string,
  author: string
) {
  try {
    info("admin quote add", interaction.user.username, interaction.user.id);

    const isAllowed = isUserPermitted(interaction);

    console.log(isAllowed);

    if (!isAllowed) return;

    if (!quote) return interaction.reply("Please provide a quote");
    if (!author) return interaction.reply("Please provide an author");

    const newQuote = await prisma.motivationQuote.create({
      data: {
        quote,
        author,
        addedBy: interaction.user.id,
      },
    });

    /**
     * Send a message to the main channelof the owner guild
     * to notify that a new quote has been added.
     * This is useful for tracking purposes and to keep the owner informed.
     */
    const mainChannel = client.channels.cache.get(
      env.MAIN_CHANNEL_ID as string
    ) as TextChannel;
    mainChannel?.send(
      `Quote added by ${interaction.user.username} with id: ${newQuote.id}`
    );

    await interaction.reply({
      content: `Quote added with id: ${newQuote.id}`,
      flags: MessageFlags.Ephemeral,
    });
    success("admin quote add", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("admin quote add", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}
