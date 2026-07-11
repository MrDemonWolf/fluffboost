import { MessageFlags } from "discord.js";
import type { CommandInteraction } from "discord.js";

import env from "./env.js";
import logger from "./logger.js";

let warned = false;

function getAllowedUsers(): string[] {
  const raw = env.ALLOWED_USERS?.trim() ?? "";
  if (!raw) {
    if (!warned) {
      logger.warn(
        "Security",
        "ALLOWED_USERS is empty — every admin command will be rejected. Set ALLOWED_USERS to enable admin access."
      );
      warned = true;
    }
    return [];
  }
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function isUserPermitted(interaction: CommandInteraction): Promise<boolean> {
  const allowedUsers = getAllowedUsers();

  if (!allowedUsers.includes(interaction.user.id)) {
    logger.unauthorized(
      "admin command",
      interaction.user.username,
      interaction.user.id,
      interaction.guildId || undefined,
    );
    await interaction.reply({
      content: "You are not allowed to use this command",
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }
  return true;
}

/**
 * Guard for guild-only commands. Replies ephemerally and returns null when the
 * interaction isn't in a server; otherwise returns the guild id.
 */
export async function requireGuildId(
  interaction: CommandInteraction
): Promise<string | null> {
  if (!interaction.guildId) {
    await interaction.reply({
      content: "This command can only be used in a server",
      flags: MessageFlags.Ephemeral,
    });
    return null;
  }
  return interaction.guildId;
}
