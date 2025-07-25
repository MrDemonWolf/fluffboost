import {
  Client,
  CommandInteraction,
  TextChannel,
  MessageFlags,
} from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import { info, success, error } from "../../../utils/commandLogger";
import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";
import { env } from "../../../utils/env";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
) {
  try {
    info("admin quote remove", interaction.user.username, interaction.user.id);

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) return;

    const quoteId = options.getString("quote_id", true);

    if (!quoteId) return interaction.reply("Please provide an id");

    const quote = await prisma.motivationQuote.findUnique({
      where: {
        id: quoteId,
      },
    });
    if (!quote) return interaction.reply(`Quote with id ${quoteId} not found`);

    await prisma.motivationQuote.delete({
      where: {
        id: quoteId,
      },
    });

    // send message to main channel
    const mainChannel = client.channels.cache.get(
      env.MAIN_CHANNEL_ID as string
    ) as TextChannel;
    mainChannel?.send(
      `Quote deleted by ${interaction.user.username} with id: ${quoteId}`
    );

    await interaction.reply({
      content: `Quote deleted with id: ${quoteId}`,
      flags: MessageFlags.Ephemeral,
    });

    success(
      `admin quote remove with ${quoteId} `,
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    error("admin quote remove", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}
