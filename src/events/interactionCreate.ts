import { MessageFlags } from "discord.js";

import type { Client, Interaction } from "discord.js";

import logger from "../utils/logger.js";
import { commandRegistry, setupAutocomplete } from "./commandRegistry.js";

export async function interactionCreateEvent(
  client: Client,
  interaction: Interaction
): Promise<void> {
  try {
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === "setup") {
        await setupAutocomplete(interaction);
      }
      return;
    }

    if (!interaction.isCommand()) {
      return;
    }

    const { commandName } = interaction;
    if (!commandName) {return;}

    const handler = commandRegistry[commandName];
    if (!handler) {
      logger.commands.warn(
        "interactionCreate",
        interaction.user.username,
        interaction.user.id,
        "Command not found"
      );
      return;
    }

    if (handler.requiresChatInput && !interaction.isChatInputCommand()) {
      return;
    }

    await handler.execute(client, interaction);
  } catch (err) {
    const cmd = interaction.isCommand() ? interaction.commandName : "unknown";
    const interactionId = "id" in interaction ? interaction.id : undefined;
    const guildId = "guildId" in interaction ? interaction.guildId : null;

    logger.error("Discord - Command", "Error executing command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: cmd,
      interactionId,
      guildId,
    });

    // Only command interactions are repliable; autocomplete errors are logged
    // but cannot prompt a user reply.
    if (interaction.isCommand()) {
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "There was an error while executing this command!",
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: "There was an error while executing this command!",
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (replyErr) {
        logger.error("Discord - Command", "Failed to send error response to user", replyErr, {
          interactionId,
          guildId,
        });
      }
    }
  }
}
