import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";
import consola from "consola";

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
import quoteRemove from "./quote/remove";
import activityAdd from "./activity/create";
import activityList from "./activity/list";
import activityRemove from "./activity/remove";

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
              .setDescription("What is the quote?")
              .setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName("quote_author")
              .setDescription("Who is the author of the quote?")
              .setRequired(true)
          );
      })
      .addSubcommand((subCommand) => {
        return subCommand
          .setName("remove")
          .setDescription("Remove a quote")
          .addStringOption((option) =>
            option
              .setName("quote_id")
              .setDescription("What is the ID of the quote you want to remove?")
              .setRequired(true)
          );
      })
      .addSubcommand((subCommand) => {
        return subCommand.setName("list").setDescription("List all quotes");
      });
  })
  .addSubcommandGroup((subCommandGroup) => {
    return subCommandGroup
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
                { name: "Playing", value: "Playing" },
                { name: "Streaming", value: "Streaming" },
                { name: "Listening", value: "Listening" },
                { name: "Custom", value: "Custom" }
              )
          )
          .addStringOption((option) =>
            option
              .setName("url")
              .setDescription("The URL for the activity (optional)")
              .setRequired(false)
          )
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName("remove")
          .setDescription("Remove an activity")
          .addStringOption((option) =>
            option
              .setName("activity_id")
              .setDescription(
                "What is the ID of the activity you want to remove?"
              )
              .setRequired(true)
          )
      )
      .addSubcommand((subcommand) => {
        return subcommand
          .setName("list")
          .setDescription("List all available activities");
      });
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
            quoteCreate(
              client,
              interaction,
              options as CommandInteractionOptionResolver
            );
            break;
          case "remove":
            quoteRemove(
              client,
              interaction,
              options as CommandInteractionOptionResolver
            );
            break;
          case "list":
            quoteList(client, interaction);
            break;
          default:
            interaction.reply({
              content: "Invalid subcommand",
              flags: MessageFlags.Ephemeral,
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
            activityRemove(
              client,
              interaction,
              options as CommandInteractionOptionResolver
            );
            break;
          case "list":
            activityList(client, interaction);
            break;
          default:
            interaction.reply({
              content: "Invalid subcommand",
              flags: MessageFlags.Ephemeral,
            });
        }
        break;

      default:
        interaction.reply({
          content: "Invalid subcommand group",
          flags: MessageFlags.Ephemeral,
        });
    }
  } catch (err) {
    error("admin", interaction.user.username, interaction.user.id);
    consola.error({
      message: `[Admin Command] Error executing command: ${err}`,
      badge: true,
      timestamp: new Date(),
    });
  }
}

export default {
  slashCommand,
  execute,
};
