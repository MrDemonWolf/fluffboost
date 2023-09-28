import type { CommandInteraction } from "discord.js";

export function checkAllowedUser(interaction: CommandInteraction) {
  const allowedUsers = process.env.ALLOWED_USERS?.split(",") as string[];
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
