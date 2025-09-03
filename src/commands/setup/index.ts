import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
} from "discord.js";

import type {
  SlashCommandSubcommandBuilder,
  Client,
  CommandInteraction,
  CommandInteractionOptionResolver,
} from "discord.js";

import { info, error } from "../../utils/commandLogger";
import logger from "../../utils/logger";

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
    logger.error("Command", "Error executing setup command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "setup",
    });
  }
}

export default {
  slashCommand,
  execute,
};
