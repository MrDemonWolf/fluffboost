import { MessageFlags } from "discord.js";

import type { CommandInteraction } from "discord.js";

import env from "./env.js";
import logger from "./logger.js";

/**
 * Check if the user is the bot owner. If not, replies with an
 * ephemeral rejection and logs the unauthorized attempt.
 *
 * @returns `true` if the user is the owner, `false` otherwise.
 */
export async function requireOwner(
  interaction: CommandInteraction,
  commandName: string
): Promise<boolean> {
  if (interaction.user.id === env.OWNER_ID) {
    return true;
  }

  logger.commands.unauthorized(commandName, interaction.user.username, interaction.user.id);
  await interaction.reply({
    content: "Only the bot owner can use this command.",
    flags: MessageFlags.Ephemeral,
  });
  return false;
}
