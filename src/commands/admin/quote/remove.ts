import {
  Client,
  CommandInteraction,
  MessageFlags,
} from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import logger from "../../../utils/logger.js";
import { isUserPermitted } from "../../../utils/permissions.js";
import { prisma } from "../../../database/index.js";
import env from "../../../utils/env.js";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
): Promise<void> {
  try {
    logger.commands.executing(
      "admin quote remove",
      interaction.user.username,
      interaction.user.id
    );

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) {
      return;
    }

    const quoteId = options.getString("quote_id", true);

    if (!quoteId) {
      await interaction.reply("Quote ID is required");
      return;
    }

    const quote = await prisma.motivationQuote.findUnique({
      where: {
        id: quoteId,
      },
    });
    if (!quote) {
      await interaction.reply(`Quote with id ${quoteId} not found`);
      return;
    }

    await prisma.motivationQuote.delete({
      where: {
        id: quoteId,
      },
    });

    // send message to main channel
    if (env.MAIN_CHANNEL_ID) {
      const mainChannel = await client.channels.fetch(env.MAIN_CHANNEL_ID);
      if (mainChannel?.isTextBased() && !mainChannel.isDMBased()) {
        await mainChannel.send(
          `Quote deleted by ${interaction.user.username} with id: ${quoteId}`
        );
      }
    }

    await interaction.reply({
      content: `Quote deleted with id: ${quoteId}`,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      `admin quote remove with ${quoteId}`,
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    logger.commands.error(
      "admin quote remove",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error(
      "Discord - Command",
      "Error executing admin quote remove command",
      err,
      {
        user: { username: interaction.user.username, id: interaction.user.id },
        command: "admin quote remove",
        quoteId: options.getString("quote_id"),
      }
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "An error occurred while processing your request.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
