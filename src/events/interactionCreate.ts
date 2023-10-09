import type { Client, Interaction, CommandInteraction } from "discord.js";
import { info, success, warn } from "../utils/commandLogger";

/**
 * Import slash commands from the commands folder.
 */
import help from "../commands/help";
import about from "../commands/about";
import quote from "../commands/quote";
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
        help.execute(client, interaction as CommandInteraction);
        break;

      case "about":
        success(
          "interactionCreate - about",
          interaction.user.username,
          interaction.user.id
        );
        about.execute(client, interaction as CommandInteraction);
        break;

      case "quote":
        success(
          "interactionCreate - quote",
          interaction.user.username,
          interaction.user.id
        );
        quote.execute(client, interaction as CommandInteraction);
        break;
      case "invite":
        success(
          "interactionCreate - invite",
          interaction.user.username,
          interaction.user.id
        );
        invite.execute(client, interaction as CommandInteraction);
        break;
      case "admin":
        success(
          "interactionCreate - admin",
          interaction.user.username,
          interaction.user.id
        );
        admin.execute(client, interaction as CommandInteraction);
        break;
      case "setup":
        success(
          "interactionCreate - setup",
          interaction.user.username,
          interaction.user.id
        );
        setup.execute(client, interaction as CommandInteraction);
        break;
      default:
        warn(
          "interactionCreate - Command not found",
          interaction.user.username,
          interaction.user.id
        );
    }
  } catch (err) {
    console.log("Error executing command: ", err);

    const interactionWithError = interaction as CommandInteraction;

    await interactionWithError.reply({
      content: "There was an error while executing this command!",
      ephemeral: true,
    });
  }
}
