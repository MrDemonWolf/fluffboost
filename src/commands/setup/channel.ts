import { MessageFlags } from "discord.js";

import type {
  Client,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";

import logger from "../../utils/logger.js";
import { prisma } from "../../database/index.js";
import { guildExists } from "../../utils/guildDatabase.js";

export default async function (
  _client: Client,
  interaction: ChatInputCommandInteraction
) {
  try {
    logger.commands.executing(
      "setup channel",
      interaction.user.username,
      interaction.user.id
    );

    if (!interaction.guildId) {
      return;
    }

    const options = interaction.options;

    const motivationChannel = options.getChannel(
      "channel",
      true
    ) as TextChannel;

    await guildExists(interaction.guildId);

    await prisma.guild.update({
      where: {
        guildId: interaction.guildId,
      },
      data: {
        motivationChannelId: motivationChannel.id,
      },
    });

    await interaction.reply({
      content: `The motivation channel has been set to <#${motivationChannel.id}>`,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "setup",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    logger.commands.error(
      "setup",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error(
      "Discord - Command",
      "Error executing setup channel command",
      err,
      {
        user: { username: interaction.user.username, id: interaction.user.id },
        command: "setup channel",
      }
    );
  }
}
