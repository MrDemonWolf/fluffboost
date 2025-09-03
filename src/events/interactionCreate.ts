import { MessageFlags } from "discord.js";

import type { Client, Interaction, CommandInteraction } from "discord.js";

import { info, success, warn } from "../utils/commandLogger";
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

    info("interactionCreate", interaction.user.username, interaction.user.id);

    const { commandName } = interaction;

    if (!commandName) return;

    switch (commandName) {
      case "help":
        success(
          "interactionCreate - help",
          interaction.user.username,
          interaction.user.id
        );
        help.execute(client, interaction);
        break;

      case "about":
        success(
          "interactionCreate - about",
          interaction.user.username,
          interaction.user.id
        );
        about.execute(client, interaction);
        break;

      case "changelog":
        success(
          "interactionCreate - changelog",
          interaction.user.username,
          interaction.user.id
        );
        changelog.execute(client, interaction);
        break;
      case "quote":
        success(
          "interactionCreate - quote",
          interaction.user.username,
          interaction.user.id
        );
        quote.execute(client, interaction);
        break;
      case "invite":
        success(
          "interactionCreate - invite",
          interaction.user.username,
          interaction.user.id
        );
        invite.execute(client, interaction);
        break;
      case "suggestion":
        success(
          "interactionCreate - suggestion",
          interaction.user.username,
          interaction.user.id
        );
        suggestion.execute(client, interaction);
        break;
      case "admin":
        success(
          "interactionCreate - admin",
          interaction.user.username,
          interaction.user.id
        );
        admin.execute(client, interaction);
        break;
      case "setup":
        success(
          "interactionCreate - setup",
          interaction.user.username,
          interaction.user.id
        );
        setup.execute(client, interaction);
        break;
      default:
        warn(
          "interactionCreate - Command not found",
          interaction.user.username,
          interaction.user.id
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
