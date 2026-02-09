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
  AutocompleteInteraction,
} from "discord.js";

import logger from "../../utils/logger.js";

/**
 * Import subcommands
 */
import channel from "./channel.js";
import schedule, { autocomplete as scheduleAutocomplete } from "./schedule.js";

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
  .addSubcommand((subCommand: SlashCommandSubcommandBuilder) => {
    return subCommand
      .setName("schedule")
      .setDescription("Customize your quote delivery schedule (premium)")
      .addStringOption((option) =>
        option
          .setName("frequency")
          .setDescription("How often to send quotes")
          .addChoices(
            { name: "Daily", value: "Daily" },
            { name: "Weekly", value: "Weekly" },
            { name: "Monthly", value: "Monthly" }
          )
      )
      .addStringOption((option) =>
        option.setName("time").setDescription("Time to send quotes in HH:mm format (e.g., 09:00)")
      )
      .addStringOption((option) =>
        option
          .setName("timezone")
          .setDescription("IANA timezone (e.g., America/New_York)")
          .setAutocomplete(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("day")
          .setDescription("Day of week (0=Sun-6=Sat) for weekly, or day of month (1-28) for monthly")
      );
  })
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(client: Client, interaction: CommandInteraction) {
  try {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    logger.commands.executing(
      "setup",
      interaction.user.username,
      interaction.user.id
    );

    const options = interaction.options as CommandInteractionOptionResolver;

    const subcommands = options.getSubcommand();

    switch (subcommands) {
      case "channel":
        await channel(client, interaction);
        break;
      case "schedule":
        await schedule(client, interaction);
        break;
      default:
        interaction.reply({
          content: "Invalid subcommand",
          flags: MessageFlags.Ephemeral,
        });
        break;
    }
  } catch (err) {
    logger.commands.error(
      "setup",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error("Discord - Command", "Error executing setup command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "setup",
    });
  }
}

export async function setupAutocomplete(interaction: AutocompleteInteraction) {
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === "schedule") {
    await scheduleAutocomplete(interaction);
  }
}

export default {
  slashCommand,
  execute,
  setupAutocomplete,
};
