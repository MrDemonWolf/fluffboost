import type { Client, CommandInteraction } from "discord.js";

import { SlashCommandBuilder, MessageFlags } from "discord.js";

import { withCommandLogging } from "../utils/commandErrors.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Get help with using the bot");

export async function execute(_client: Client, interaction: CommandInteraction): Promise<void> {
  await withCommandLogging("help", interaction, async () => {
    await interaction.reply({
      content: `**Commands**\n
            \`/about\` - Learn more about the bot
            \`/invite\` - Invite me to your server!
            \`/quote\` - Get a random quote
            \`/setup channel\` - Set the channel for quotes (admin only)
            \`/setup schedule\` - Customize quote delivery schedule (premium)
            \`/admin\` - Admin commands (selected users only)
            \`/premium\` - View premium subscription info and status
            \`/owner premium test-create\` - Create a test entitlement (owner only)
            \`/owner premium test-delete\` - Delete a test entitlement (owner only)`,
      flags: MessageFlags.Ephemeral,
    });
  });
}

export default {
  slashCommand,
  execute,
};
