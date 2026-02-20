import { CommandInteraction, MessageFlags } from "discord.js";

import { trimArray } from "./trimArray.js";
import env from "./env.js";
import logger from "./logger.js";

export async function isUserPermitted(interaction: CommandInteraction) {
  const allowedUsersArray = env.ALLOWED_USERS?.split(",") as string[];
  const allowedUsers = trimArray(allowedUsersArray);

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
