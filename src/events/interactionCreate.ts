import type { Client, Interaction, CommandInteraction } from "discord.js";

import { info, success, warn } from "../utils/commandLogger";
/**
 * Import slash commands from the commands folder.
 */
import about from "../commands/about";
import admin from "../commands/admin";
import quote from "../commands/quote";

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
      case "admin":
        success(
          "interactionCreate - admin",
          interaction.user.username,
          interaction.user.id
        );
        return admin.execute(client, interaction as CommandInteraction);
      case "about":
        success(
          "interactionCreate - about",
          interaction.user.username,
          interaction.user.id
        );
        return about.execute(client, interaction as CommandInteraction);
      case "quote":
        success(
          "interactionCreate - quote",
          interaction.user.username,
          interaction.user.id
        );
        return quote.execute(client, interaction as CommandInteraction);
      default:
        warn(
          "interactionCreate - Command not found",
          interaction.user.username,
          interaction.user.id
        );
        return;
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
