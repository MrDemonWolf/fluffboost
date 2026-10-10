import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  InteractionContextType,
  MessageFlags,
} from "discord.js";

import type {
  SlashCommandSubcommandBuilder,
  Client,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
} from "discord.js";

import { requireGuildAdministrator } from "../../utils/permissions.js";

/**
 * Import subcommands
 */
import channel from "./channel.js";
import schedule, { autocomplete as scheduleAutocomplete } from "./schedule.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Setup the bot")
  // Server configuration only; hides the command from bot DMs.
  .setContexts(InteractionContextType.Guild)
  .addSubcommand((subCommand: SlashCommandSubcommandBuilder) => {
    return subCommand
      .setName("channel")
      .setDescription(
        "Set the channel where motivation quotes are delivered on this server's schedule"
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
          .setMinValue(0)
          .setMaxValue(28)
      );
  })
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

type SetupSubcommand = (client: Client, interaction: ChatInputCommandInteraction) => Promise<void>;

export const setupRoutes: ReadonlyMap<string, SetupSubcommand> = new Map([
  ["channel", channel],
  ["schedule", schedule],
]);

/**
 * Subcommands carry their own withCommandLogging wrapper and Administrator
 * check; errors thrown here are answered by the interactionCreate router.
 */
export async function execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireGuildAdministrator(interaction))) {
    return;
  }

  const handler = setupRoutes.get(interaction.options.getSubcommand());
  if (!handler) {
    await interaction.reply({
      content: "Invalid subcommand",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await handler(client, interaction);
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
