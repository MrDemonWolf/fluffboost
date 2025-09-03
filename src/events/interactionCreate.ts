import { MessageFlags } from "discord.js";

import type { Client, Interaction, CommandInteraction } from "discord.js";

import logger from "../utils/logger";

/**
 * Import slash commands from the commands folder.
 */
import help from "../commands/help";
import about from "../commands/about";
import changelog from "../commands/changelog";
import quote from "../commands/quote";
import suggestion from "../commands/suggestion";
import invite from "../commands/invite";
import admin from "../commands/admin";
import setup from "../commands/setup";

export async function interactionCreateEvent(
  client: Client,
  interaction: Interaction
) {
  try {
    if (!interaction.isCommand()) return;

    logger.commands.executing(
      "interactionCreate",
      interaction.user.username,
      interaction.user.id
    );

    const { commandName } = interaction;

    if (!commandName) return;

    switch (commandName) {
      case "help":
        logger.commands.success(
          "interactionCreate - help",
          interaction.user.username,
          interaction.user.id
        );
        help.execute(client, interaction);
        break;

      case "about":
        logger.commands.success(
          "interactionCreate - about",
          interaction.user.username,
          interaction.user.id
        );
        about.execute(client, interaction);
        break;

      case "changelog":
        logger.commands.success(
          "interactionCreate - changelog",
          interaction.user.username,
          interaction.user.id
        );
        changelog.execute(client, interaction);
        break;
      case "quote":
        logger.commands.success(
          "interactionCreate - quote",
          interaction.user.username,
          interaction.user.id
        );
        quote.execute(client, interaction);
        break;
      case "invite":
        logger.commands.success(
          "interactionCreate - invite",
          interaction.user.username,
          interaction.user.id
        );
        invite.execute(client, interaction);
        break;
      case "suggestion":
        logger.commands.success(
          "interactionCreate - suggestion",
          interaction.user.username,
          interaction.user.id
        );
        suggestion.execute(client, interaction);
        break;
      case "admin":
        logger.commands.success(
          "interactionCreate - admin",
          interaction.user.username,
          interaction.user.id
        );
        admin.execute(client, interaction);
        break;
      case "setup":
        logger.commands.success(
          "interactionCreate - setup",
          interaction.user.username,
          interaction.user.id
        );
        setup.execute(client, interaction);
        break;
      default:
        logger.commands.warn(
          "interactionCreate",
          interaction.user.username,
          interaction.user.id,
          "Command not found"
        );
    }
  } catch (err) {
    logger.error("Command", "Error executing command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: interaction.isCommand() ? interaction.commandName : "unknown",
    });

    const interactionWithError = interaction as CommandInteraction;

    await interactionWithError.reply({
      content: "There was an error while executing this command!",
      flags: MessageFlags.Ephemeral,
    });
  }
}
