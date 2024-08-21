import type {
  Client,
  CommandInteraction,
  CommandInteractionOptionResolver,
  TextChannel,
} from "discord.js";
import { info, success, error } from "../../utils/commandLogger";
import { prisma } from "../../database";
import { guildExists } from "../../utils/guildExists";

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
        motivationChannel: motivationChannel.id,
      },
    });

    await interaction.reply({
      content: `The motivation channel has been set to <#${motivationChannel.id}>`,
      ephemeral: true,
    });

    success("setup", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("setup", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}
