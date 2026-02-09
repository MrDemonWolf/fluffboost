import { SlashCommandBuilder, MessageFlags } from "discord.js";

import type {
  Client,
  CommandInteraction,
  CommandInteractionOptionResolver,
} from "discord.js";

import logger from "../../utils/logger.js";
import env from "../../utils/env.js";

/**
 * Import subcommands
 */
import premiumTestCreate from "./premium/testCreate.js";
import premiumTestDelete from "./premium/testDelete.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("owner")
  .setDescription("Bot owner commands")
  .addSubcommandGroup((subCommandGroup) => {
    return subCommandGroup
      .setName("premium")
      .setDescription("Manage premium test entitlements")
      .addSubcommand((subCommand) => {
        return subCommand
          .setName("test-create")
          .setDescription("Create a test entitlement for a user")
          .addUserOption((option) =>
            option
              .setName("user")
              .setDescription("User to grant the test entitlement to (defaults to you)")
              .setRequired(false)
          );
      })
      .addSubcommand((subCommand) => {
        return subCommand
          .setName("test-delete")
          .setDescription("Delete a test entitlement")
          .addStringOption((option) =>
            option
              .setName("entitlement_id")
              .setDescription("The entitlement ID to delete")
              .setRequired(true)
          );
      });
  });

export async function execute(client: Client, interaction: CommandInteraction) {
  try {
    if (!interaction.isChatInputCommand()) {
      return;
    }

    logger.commands.executing(
      "owner",
      interaction.user.username,
      interaction.user.id
    );

    if (interaction.user.id !== env.OWNER_ID) {
      logger.commands.unauthorized(
        "owner",
        interaction.user.username,
        interaction.user.id
      );
      await interaction.reply({
        content: "Only the bot owner can use this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const options = interaction.options;
    const subCommandGroup = options.getSubcommandGroup();
    const subCommand = options.getSubcommand();

    switch (subCommandGroup) {
      case "premium":
        switch (subCommand) {
          case "test-create":
            await premiumTestCreate(
              client,
              interaction,
              options as CommandInteractionOptionResolver
            );
            break;
          case "test-delete":
            await premiumTestDelete(
              client,
              interaction,
              options as CommandInteractionOptionResolver
            );
            break;
          default:
            await interaction.reply({
              content: "Invalid subcommand",
              flags: MessageFlags.Ephemeral,
            });
        }
        break;

      default:
        await interaction.reply({
          content: "Invalid subcommand group",
          flags: MessageFlags.Ephemeral,
        });
    }
  } catch (err) {
    logger.commands.error(
      "owner",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error("Discord - Command", "Error executing owner command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "owner",
    });
  }
}

export default {
  slashCommand,
  execute,
};
