import type { Client, CommandInteraction } from "discord.js";

import { SlashCommandBuilder, MessageFlags } from "discord.js";

import logger from "../utils/logger";
import posthog from "../utils/posthog";

export const slashCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Get help with using the bot");

export function execute(client: Client, interaction: CommandInteraction) {
  try {
    logger.commands.executing(
      "help",
      interaction.user.username,
      interaction.user.id
    );

    interaction.reply({
      content: `**Commands**\n
            \`/about\` - Learn more about the bot
            \`/invite\` - Invite me to your server!
            \`/quote\` - Get a random quote
            \`/setup\` - Setup the bot for your server such as the channel to send quotes to. (admin only)
            \`/admin\` - Admin commands (selected users only)`,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "help",
      interaction.user.username,
      interaction.user.id
    );

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
    logger.commands.error(
      "help",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error("Discord - Command", "Error executing help command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "help",
    });
  }
}

export default {
  slashCommand,
  execute,
};
