import { MessageFlags } from "discord.js";
import consola from "consola";

import type {
  Client,
  CommandInteraction,
  CommandInteractionOptionResolver,
  TextChannel,
} from "discord.js";

import { info, success, error } from "../../utils/commandLogger";
import { prisma } from "../../database";
import { guildExists } from "../../utils/guildDatabase";

export default async function (
  client: Client,
  interaction: CommandInteraction
) {
  try {
    info("setup channel", interaction.user.username, interaction.user.id);

    if (!interaction.guildId) return;

    const options = interaction.options as CommandInteractionOptionResolver;

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

    success("setup", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("setup", interaction.user.username, interaction.user.id);
    consola.error({
      message: `[Setup Channel Command] Error executing command: ${err}`,
      badge: true,
      timestamp: new Date(),
    });
  }
}
