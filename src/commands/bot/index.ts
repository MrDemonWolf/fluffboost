import type {
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandBuilder,
  Client,
  CommandInteraction,
} from "discord.js";

import { SlashCommandBuilder } from "discord.js";

import { info, error } from "../../utils/commandLogger";

/**
 * Import subcommands
 */
import quoteAdd from "./quote/add";
import quoteList from "./quote/list";

export const slashCommand = new SlashCommandBuilder()
  .setName("bot")
  .setDescription("Mange the bot")
  .addSubcommandGroup((subCommandGroup: SlashCommandSubcommandGroupBuilder) => {
    return subCommandGroup
      .setName("quote")
      .setDescription("Get a random quote")
      .addSubcommand((subCommand: SlashCommandSubcommandBuilder) => {
        return subCommand
          .setName("add")
          .setDescription("Add a quote")
          .addStringOption((option) =>
            option
              .setName("quote")
              .setDescription("The quote you want to add")
              .setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName("author")
              .setDescription("The author of the quote")
              .setRequired(true)
          );
      })
      .addSubcommand((subCommand: SlashCommandSubcommandBuilder) => {
        return subCommand.setName("remove").setDescription("Remove a quote");
      })
      .addSubcommand((subCommand: SlashCommandSubcommandBuilder) => {
        return subCommand.setName("list").setDescription("List all quote");
      });
  });

export async function execute(client: Client, interaction: CommandInteraction) {
  try {
    if (!interaction.isChatInputCommand()) return;

    info("bot", interaction.user.username, interaction.user.id);

    const subCommandGroup = interaction.options.getSubcommandGroup(false);
    const subCommand = interaction.options.getSubcommand(false);

    if (subCommandGroup === "quote") {
      if (subCommand === "add") {
        const quote = interaction.options.getString("quote", true);
        const author = interaction.options.getString("author", true);

        quoteAdd(client, interaction, quote, author);
      }
      if (subCommand === "list") {
        quoteList(client, interaction);
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
