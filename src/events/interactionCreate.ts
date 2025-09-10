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
    if (!interaction.isCommand()) {
      return;
    }

    logger.commands.executing(
      "interactionCreate",
      interaction.user.username,
      interaction.user.id
    );

    const { commandName } = interaction;

    if (!commandName) {
      return;
    }

    switch (commandName) {
      case "help":
        await help.execute(client, interaction);
        logger.commands.success(
          "interactionCreate - help",
          interaction.user.username,
          interaction.user.id
        );
        break;

      case "about":
        await about.execute(client, interaction);
        logger.commands.success(
          "interactionCreate - about",
          interaction.user.username,
          interaction.user.id
        );
        break;

      case "changelog":
        await changelog.execute(client, interaction);
        logger.commands.success(
          "interactionCreate - changelog",
          interaction.user.username,
          interaction.user.id
        );
        break;
      case "quote":
        await quote.execute(client, interaction);
        logger.commands.success(
          "interactionCreate - quote",
          interaction.user.username,
          interaction.user.id
        );
        break;
      case "invite":
        await invite.execute(client, interaction);
        logger.commands.success(
          "interactionCreate - invite",
          interaction.user.username,
          interaction.user.id
        );
        break;
      case "suggestion":
        await suggestion.execute(client, interaction);
        logger.commands.success(
          "interactionCreate - suggestion",
          interaction.user.username,
          interaction.user.id
        );
        break;
      case "admin":
        await admin.execute(client, interaction);
        logger.commands.success(
          "interactionCreate - admin",
          interaction.user.username,
          interaction.user.id
        );
        break;
      case "setup":
        await setup.execute(client, interaction);
        logger.commands.success(
          "interactionCreate - setup",
          interaction.user.username,
          interaction.user.id
        );
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
    logger.error("Discord - Command", "Error executing command", err, {
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
