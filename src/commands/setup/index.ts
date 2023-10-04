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
          ephemeral: true,
        });
        break;
    }
  } catch (err) {
    error("setup", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}

export default {
  slashCommand,
  execute,
};
