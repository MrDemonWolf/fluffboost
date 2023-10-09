import type { Client, CommandInteraction } from "discord.js";

import { SlashCommandBuilder } from "discord.js";

import { info, success, error } from "../utils/commandLogger";

export const slashCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Get help with using the bot");

export function execute(client: Client, interaction: CommandInteraction) {
  try {
    info("help", interaction.user.username, interaction.user.id);

    interaction.reply({
      content: `**Commands**\n
            \`/about\` - Learn more about the bot
            \`/invite\` - Invite me to your server!
            \`/quote\` - Get a random quote
            \`/setup\` - Setup the bot for your server such as the channel to send quotes to. (admin only)
            \`/admin\` - Admin commands (selected users only)`,
      ephemeral: true,
    });
    success("help", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("help", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}

export default {
  slashCommand,
  execute,
};
