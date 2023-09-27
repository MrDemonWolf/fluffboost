import type { Client, Interaction, CommandInteraction } from "discord.js";

/**
 * Import slash commands from the commands folder.
 */
import about from "../commands/about";

export async function interactionCreateEvent(
  client: Client,
  interaction: Interaction
) {
  try {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (!commandName) return;

    switch (commandName) {
      case "about":
        return about.execute(client, interaction as CommandInteraction);
      default:
        // consola.warn({
        //   message: `Unknown command: ${commandName}`,
        //   badge: true,
        // });
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
