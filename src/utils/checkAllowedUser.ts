import type { CommandInteraction } from "discord.js";

import { trimArray } from "./trimArray";

export function checkAllowedUser(interaction: CommandInteraction) {
  const allowedUsersArray = process.env.ALLOWED_USERS?.split(",") as string[];
  const allowedUsers = trimArray(allowedUsersArray);

  if (!allowedUsers.includes(interaction.user.id)) {
    console.error(`User ${interaction.user.id} tired to use bot quote add`);
    interaction.reply({
      content: "You are not allowed to use this command",
      ephemeral: true,
    });
    return false;
  }
  return true;
}

export default checkAllowedUser;
