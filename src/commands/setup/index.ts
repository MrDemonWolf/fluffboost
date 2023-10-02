import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} from "discord.js";
import type {
  SlashCommandSubcommandBuilder,
  Client,
  CommandInteraction,
  CommandInteractionOptionResolver,
  TextChannel,
} from "discord.js";
import { info, success, error } from "src/utils/commandLogger";
import { prisma } from "src/database";
import { guildExists } from "src/utils/guildExists";

/**
 * Import subcommands
 */

export const slashCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Setup the bot")
  .addSubcommand((subCommand: SlashCommandSubcommandBuilder) => {
    return subCommand
      .setName("channel")
      .setDescription(
        "Setup the channel in which the bot will send the message to every day at 8am CST"
      )
      .addChannelOption((option) =>
        option
          .setName("channel")
          .setDescription("Where the bot will send the message to")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      );
  })
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(client: Client, interaction: CommandInteraction) {
  try {
    info("setup", interaction.user.username, interaction.user.id);

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
    });

    success("setup", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("setup", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}

export default {
  slashCommand,
  execute,
};
