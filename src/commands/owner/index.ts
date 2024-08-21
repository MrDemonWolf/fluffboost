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

import guilds from "./guilds";

export const slashCommand = new SlashCommandBuilder()
  .setName("owner")
  .setDescription("For bot owner to be able to debug the bot")
  .addSubcommand((subCommand: SlashCommandSubcommandBuilder) => {
    return subCommand
      .setName("guilds")
      .setDescription("See how many guilds the bot is connected to");
  })
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(client: Client, interaction: CommandInteraction) {
  try {
    if (!interaction.isChatInputCommand()) return;

    // Check if the owner is authenticated
    if (interaction.user.id !== process.env.OWNER_ID) {
      return interaction.reply({
        content: "You are not authenticated to use this command!",
        ephemeral: true,
      });
    }

    info("owner", interaction.user.username, interaction.user.id);

    const options = interaction.options;

    const subcommands = options.getSubcommand();

    switch (subcommands) {
      case "guilds":
        await guilds(client, interaction);
        break;
      default:
        interaction.reply({
          content: "Invalid subcommand",
          ephemeral: true,
        });
        break;
    }
  } catch (err) {
    error("owner", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}

export default {
  slashCommand,
  execute,
};
