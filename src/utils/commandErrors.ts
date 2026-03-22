import { MessageFlags } from "discord.js";

import type { CommandInteraction, ChatInputCommandInteraction } from "discord.js";

/**
 * Safely reply with an ephemeral error message if the interaction
 * hasn't already been replied to or deferred.
 */
export async function safeErrorReply(
  interaction: CommandInteraction | ChatInputCommandInteraction,
  message = "An error occurred while processing your request."
): Promise<void> {
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({
      content: message,
      flags: MessageFlags.Ephemeral,
    });
  }
}
