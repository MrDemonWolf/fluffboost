import type {
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandBuilder,
  Client,
  CommandInteraction,
  CommandInteractionOption,
} from "discord.js";

import { SlashCommandBuilder } from "discord.js";

import { info, success, error } from "../../utils/commandLogger";

/**
 * Import subcommands
 */
import qouteAdd from "./qoute/add";

export const slashCommand = new SlashCommandBuilder()
  .setName("bot")
  .setDescription("Mange the bot")
  .addSubcommandGroup((subCommandGroup: SlashCommandSubcommandGroupBuilder) => {
    return subCommandGroup
      .setName("qoute")
      .setDescription("Get a random qoute")
      .addSubcommand((subCommand: SlashCommandSubcommandBuilder) => {
        return subCommand
          .setName("add")
          .setDescription("Add a qoute")
          .addStringOption((option) =>
            option
              .setName("qoute")
              .setDescription("The qoute you want to add")
              .setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName("author")
              .setDescription("The author of the qoute")
              .setRequired(true)
          );
      })
      .addSubcommand((subCommand: SlashCommandSubcommandBuilder) => {
        return subCommand.setName("remove").setDescription("Remove a qoute");
      })
      .addSubcommand((subCommand: SlashCommandSubcommandBuilder) => {
        return subCommand.setName("list").setDescription("List all qoutes");
      });
  });

export async function execute(client: Client, interaction: CommandInteraction) {
  try {
    if (!interaction.isChatInputCommand()) return;

    info("bot", interaction.user.username, interaction.user.id);

    const subCommandGroup = interaction.options.getSubcommandGroup(false);
    const subCommand = interaction.options.getSubcommand(false);

    if (subCommandGroup === "qoute") {
      if (subCommand === "add") {
        const qoute = interaction.options.getString("qoute", true);
        const author = interaction.options.getString("author", true);

        qouteAdd(client, interaction, qoute, author);
      }
    }
  } catch (err) {
    error("about", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}

export default {
  slashCommand,
  execute,
};
