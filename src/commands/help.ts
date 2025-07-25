import type { Client, CommandInteraction } from "discord.js";
import consola from "consola";

import { SlashCommandBuilder, MessageFlags } from "discord.js";

import { info, success, error } from "../utils/commandLogger";
import posthog from "../utils/posthog";

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
      flags: MessageFlags.Ephemeral,
    });

    success("help", interaction.user.username, interaction.user.id);

    posthog.capture({
      distinctId: interaction.user.id,
      event: "help command used",
      properties: {
        environment: process.env.NODE_ENV,
        userId: interaction.user.id,
        username: interaction.user.username,
      },
    });
  } catch (err) {
    error("help", interaction.user.username, interaction.user.id);
    consola.error(err);
  }
}

export default {
  slashCommand,
  execute,
};
