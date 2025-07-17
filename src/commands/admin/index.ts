import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import type {
  Client,
  CommandInteraction,
  CommandInteractionOptionResolver,
} from "discord.js";
import { info, error } from "../../utils/commandLogger";

/**
 * Import subcommands
 */
import quoteCreate from "./quote/create";
import quoteList from "./quote/list";
import qouteRemove from "./quote/remove";
import activityAdd from "./activity/create";
import activityList from "./activity/list";
// import activityDel from "./activity/del";

export const slashCommand = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Mange the bot")
  .addSubcommandGroup((subCommandGroup) => {
    return subCommandGroup
      .setName("quote")
      .setDescription("Get a random quote")
      .addSubcommand((subCommand) => {
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
      .addSubcommand((subCommand) => {
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
      .addSubcommand((subCommand) => {
        return subCommand.setName("list").setDescription("List all quotes");
      });
  })
  .addSubcommandGroup((subCommandGroup) => {
    return (
      subCommandGroup
        .setName("activity")
        .setDescription("Manage the bot's activity status")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("create")
            .setDescription("Create a new activity for the bot")
            .addStringOption((option) =>
              option
                .setName("activity")
                .setDescription("What is the bot doing?")
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("type")
                .setDescription("The type of activity")
                .setRequired(true)
                .addChoices(
                  { name: "Playing", value: "PLAYING" },
                  { name: "Streaming", value: "STREAMING" },
                  { name: "Listening", value: "LISTENING" },
                  { name: "Custom", value: "CUSTOM" }
                )
            )
            .addStringOption((option) =>
              option
                .setName("url")
                .setDescription("The URL for the activity (optional)")
                .setRequired(false)
            )
        )
        // .addSubcommand((subcommand) =>
        //   subcommand
        //     .setName("remove")
        //     .setDescription("Remove an activity")
        //     .addStringOption((option) =>
        //       option
        //         .setName("id")
        //         .setDescription("The ID of the activity to remove")
        //         .setRequired(true)
        //     )
        // )
        .addSubcommand((subcommand) => {
          return subcommand
            .setName("list")
            .setDescription("List all available activities");
        })
    );
  })
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(client: Client, interaction: CommandInteraction) {
  try {
    if (!interaction.isChatInputCommand()) return;

    info("admin", interaction.user.username, interaction.user.id);

    const options = interaction.options;

    const subCommandGroup = options.getSubcommandGroup();
    const subCommand = options.getSubcommand();

    switch (subCommandGroup) {
      case "quote":
        switch (subCommand) {
          case "create":
            const quote = options.getString("quote", true);
            const author = options.getString("author", true);

            quoteCreate(client, interaction, quote, author);
            break;
          case "remove":
            const id = options.getString("id", true);

            qouteRemove(client, interaction, id);
            break;
          case "list":
            quoteList(client, interaction);
            break;
          default:
            interaction.reply({
              content: "Invalid subcommand",
              ephemeral: true,
            });
        }
        break;
      case "activity":
        switch (subCommand) {
          case "create":
            activityAdd(
              client,
              interaction,
              options as CommandInteractionOptionResolver
            );
            break;
          case "remove":
            // const id = options.getString("id", true);
            // activityDel(client, interaction, id);
            break;
          case "list":
            activityList(client, interaction);
            break;
          default:
            interaction.reply({
              content: "Invalid subcommand",
              ephemeral: true,
            });
        }
        break;

      default:
        interaction.reply({
          content: "Invalid subcommand group",
          ephemeral: true,
        });
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
