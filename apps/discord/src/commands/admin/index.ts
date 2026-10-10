import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} from "discord.js";

import type { Client, ChatInputCommandInteraction } from "discord.js";
import { isUserPermitted } from "../../utils/permissions.js";
import { MAX_QUOTE_LENGTH, MAX_QUOTE_AUTHOR_LENGTH } from "../../utils/quoteLimits.js";

/**
 * Import subcommands
 */
import quoteCreate from "./quote/create.js";
import quoteList from "./quote/list.js";
import quoteRemove from "./quote/remove.js";
import activityAdd from "./activity/create.js";
import activityList from "./activity/list.js";
import activityRemove from "./activity/remove.js";
import suggestionList from "./suggestion/list.js";
import suggestionApprove from "./suggestion/approve.js";
import suggestionReject from "./suggestion/reject.js";
import suggestionStats from "./suggestion/stats.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("admin")
  .setDescription("Manage the bot")
  .addSubcommandGroup((subCommandGroup) => {
    return subCommandGroup
      .setName("quote")
      .setDescription("Manage motivation quotes")
      .addSubcommand((subCommand) => {
        return subCommand
          .setName("create")
          .setDescription("Create new quote")
          .addStringOption((option) =>
            option
              .setName("quote")
              .setDescription("What is the quote?")
              .setMinLength(1)
              .setMaxLength(MAX_QUOTE_LENGTH)
              .setRequired(true)
          )
          .addStringOption((option) =>
            option
              .setName("quote_author")
              .setDescription("Who is the author of the quote?")
              .setMinLength(1)
              .setMaxLength(MAX_QUOTE_AUTHOR_LENGTH)
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
  .addSubcommandGroup((subCommandGroup) => {
    return subCommandGroup
      .setName("suggestion")
      .setDescription("Manage quote suggestions")
      .addSubcommand((subCommand) => {
        return subCommand
          .setName("list")
          .setDescription("List quote suggestions")
          .addStringOption((option) =>
            option
              .setName("status")
              .setDescription("Filter by status")
              .setRequired(false)
              .addChoices(
                { name: "Pending", value: "Pending" },
                { name: "Approved", value: "Approved" },
                { name: "Rejected", value: "Rejected" },
              ),
          )
          .addIntegerOption((option) =>
            option
              .setName("page")
              .setDescription("Page of 500 suggestions, newest first")
              .setMinValue(1)
              .setRequired(false),
          );
      })
      .addSubcommand((subCommand) => {
        return subCommand
          .setName("approve")
          .setDescription("Approve a quote suggestion")
          .addStringOption((option) =>
            option
              .setName("suggestion_id")
              .setDescription("The ID of the suggestion to approve")
              .setRequired(true),
          );
      })
      .addSubcommand((subCommand) => {
        return subCommand
          .setName("reject")
          .setDescription("Reject a quote suggestion")
          .addStringOption((option) =>
            option
              .setName("suggestion_id")
              .setDescription("The ID of the suggestion to reject")
              .setRequired(true),
          )
          .addStringOption((option) =>
            option
              .setName("reason")
              .setDescription("Reason for rejection")
              .setMaxLength(1024)
              .setRequired(false),
          );
      })
      .addSubcommand((subCommand) => {
        return subCommand
          .setName("stats")
          .setDescription("View suggestion statistics");
      });
  })
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

type AdminSubcommand = (client: Client, interaction: ChatInputCommandInteraction) => Promise<void>;

/** Handlers keyed by "<group> <subcommand>", matching the builder above. */
export const adminRoutes: ReadonlyMap<string, AdminSubcommand> = new Map([
  ["quote create", quoteCreate],
  ["quote remove", quoteRemove],
  ["quote list", quoteList],
  ["activity create", activityAdd],
  ["activity remove", activityRemove],
  ["activity list", activityList],
  ["suggestion list", suggestionList],
  ["suggestion approve", suggestionApprove],
  ["suggestion reject", suggestionReject],
  ["suggestion stats", suggestionStats],
]);

/**
 * Each subcommand wraps itself in withCommandLogging, so the router does not
 * (nesting double-logged and reported router success after a handler failed).
 * Anything thrown here is caught and answered by the interactionCreate router.
 */
export async function execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
  // Authorize once for every subcommand, including any added later. Each
  // subcommand keeps its own check as defense in depth for other entry points.
  if (!(await isUserPermitted(interaction))) {
    return;
  }

  const group = interaction.options.getSubcommandGroup();
  const subcommand = interaction.options.getSubcommand();
  const handler = adminRoutes.get(`${group} ${subcommand}`);

  if (!handler) {
    await interaction.reply({
      content: "Invalid subcommand",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await handler(client, interaction);
}

export default {
  slashCommand,
  execute,
};
