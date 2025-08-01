import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} from "discord.js";
import consola from "consola";

import type {
  SlashCommandSubcommandBuilder,
  Client,
  CommandInteraction,
  CommandInteractionOptionResolver,
} from "discord.js";

import { info, error } from "../../utils/commandLogger";

/**
 * Import subcommands
 */
import channel from "./channel";

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
    if (!interaction.isChatInputCommand()) return;

    info("setup", interaction.user.username, interaction.user.id);

    const options = interaction.options as CommandInteractionOptionResolver;

    const subcommands = options.getSubcommand();

    switch (subcommands) {
      case "channel":
        await channel(client, interaction);
        break;
      default:
        interaction.reply({
          content: "Invalid subcommand",
          flags: MessageFlags.Ephemeral,
        });
        break;
    }
  } catch (err) {
    error("setup", interaction.user.username, interaction.user.id);
    consola.error({
      message: `[Setup Command] Error executing command: ${err}`,
      badge: true,
      timestamp: new Date(),
    });
  }
}

export default {
  slashCommand,
  execute,
};
