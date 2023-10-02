import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import type {
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandBuilder,
  Client,
  CommandInteraction,
  CommandInteractionOptionResolver,
} from "discord.js";
import { info, error } from "../../utils/commandLogger";

/**
 * Import subcommands
 */
import quoteAdd from "./quote/add";
import quoteList from "./quote/list";
import qouteDel from "./quote/del";

export const slashCommand = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Mange the bot")
  .addSubcommandGroup((subCommandGroup: SlashCommandSubcommandGroupBuilder) => {
    return subCommandGroup
      .setName("quote")
      .setDescription("Get a random quote")
      .addSubcommand((subCommand: SlashCommandSubcommandBuilder) => {
        return subCommand
          .setName("create")
          .setDescription("Create new quote")
          .addStringOption((option) =>
            option
              .setName("quote")
              .setDescription("The quote you want to create")
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
        return subCommand
          .setName("remove")
          .setDescription("Remove a quote")
          .addStringOption((option) =>
            option
              .setName("id")
              .setDescription("The id of the quote you want to remove")
              .setRequired(true)
          );
      })
      .addSubcommand((subCommand: SlashCommandSubcommandBuilder) => {
        return subCommand.setName("list").setDescription("List all quote");
      });
  })
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(client: Client, interaction: CommandInteraction) {
  try {
    if (!interaction.isChatInputCommand()) return;

    info("admin", interaction.user.username, interaction.user.id);

    const options = interaction.options as CommandInteractionOptionResolver;

    const subCommandGroup = interaction.options.getSubcommandGroup(false);
    const subCommand = interaction.options.getSubcommand(false);

    if (subCommandGroup === "quote") {
      if (subCommand === "create") {
        const quote = options.getString("quote", true);
        const author = options.getString("author", true);

        quoteAdd(client, interaction, quote, author);
      }
      if (subCommand === "remove") {
        const id = options.getString("id", true);

        qouteDel(client, interaction, id);
      }
      if (subCommand === "list") {
        quoteList(client, interaction);
      }
    }
  } catch (err) {
    error("admin", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}

export default {
  slashCommand,
  execute,
};
