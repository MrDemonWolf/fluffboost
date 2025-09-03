import {
  Client,
  CommandInteraction,
  TextChannel,
  MessageFlags,
} from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import logger from "../../../utils/logger";
import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";
import env from "../../../utils/env";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver,
) {
  try {
    logger.commands.executing(
      "admin quote remove",
      interaction.user.username,
      interaction.user.id,
    );

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) {
return;
}

    const quoteId = options.getString("quote_id", true);

    if (!quoteId) {
return interaction.reply("Quote ID is required");
}

    const quote = await prisma.motivationQuote.findUnique({
      where: {
        id: quoteId,
      },
    });
    if (!quote) {
return interaction.reply(`Quote with id ${quoteId} not found`);
}

    await prisma.motivationQuote.delete({
      where: {
        id: quoteId,
      },
    });

    // send message to main channel
    const mainChannel = client.channels.cache.get(
      env.MAIN_CHANNEL_ID as string,
    ) as TextChannel;
    mainChannel?.send(
      `Quote deleted by ${interaction.user.username} with id: ${quoteId}`,
    );

    await interaction.reply({
      content: `Quote deleted with id: ${quoteId}`,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      `admin quote remove with ${quoteId}`,
      interaction.user.username,
      interaction.user.id,
    );
  } catch (err) {
    logger.commands.error(
      "admin quote remove",
      interaction.user.username,
      interaction.user.id,
      err,
    );
    logger.error("Command", "Error executing admin quote remove command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "admin quote remove",
      quoteId: options.getString("quote_id"),
    });
  }
}
