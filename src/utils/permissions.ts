import { MessageFlags } from "discord.js";

import type { CommandInteraction } from "discord.js";

import { trimArray } from "./trimArray";
import { env } from "./env";

export function isUserPermitted(interaction: CommandInteraction) {
  const allowedUsersArray = env.ALLOWED_USERS?.split(",") as string[];
  const allowedUsers = trimArray(allowedUsersArray);

  if (!allowedUsers.includes(interaction.user.id)) {
    console.error(`User ${interaction.user.id} tired to use bot quote add`);
    interaction.reply({
      content: "You are not allowed to use this command",
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }
  return true;
}
