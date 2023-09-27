import type { Client, Interaction, CommandInteraction } from "discord.js";

import { info, success, error } from "../utils/commandLogger";
/**
 * Import slash commands from the commands folder.
 */
import about from "../commands/about";
import bot from "../commands/bot";
import { warn } from "console";

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
      case "about":
        success(
          "interactionCreate - about",
          interaction.user.username,
          interaction.user.id
        );
        return about.execute(client, interaction as CommandInteraction);
      case "bot":
        success(
          "interactionCreate - bot",
          interaction.user.username,
          interaction.user.id
        );
        return bot.execute(client, interaction as CommandInteraction);
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
