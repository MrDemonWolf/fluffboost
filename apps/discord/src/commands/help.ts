import type { Client, CommandInteraction } from "discord.js";

import { SlashCommandBuilder, MessageFlags } from "discord.js";

import { withCommandLogging } from "../utils/commandErrors.js";
import env from "../utils/env.js";
import { allowsTestEntitlements } from "../utils/entitlementPolicy.js";
import { isPremiumEnabled } from "../utils/premium.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Get help with using the bot");

/**
 * Lines mirror what commandRegistry registers for the current NODE_ENV: the
 * /owner group is only registered outside production.
 */
export function buildHelpText(): string {
  const lines = [
    "**Commands**",
    "`/about` - Learn more about the bot",
    "`/changelog` - See the latest changes to the bot",
    "`/invite` - Invite me to your server!",
    "`/quote` - Get a random quote",
    "`/suggestion` - Suggest a quote for review",
    "`/setup channel` - Set the channel for quotes (admin only)",
    `\`/setup schedule\` - Customize quote delivery schedule${isPremiumEnabled() ? " (premium)" : ""}`,
    "`/admin` - Admin commands (selected users only)",
    "`/premium` - View premium subscription info and status",
  ];
  if (allowsTestEntitlements(env.NODE_ENV)) {
    lines.push(
      "`/owner premium test-create` - Create a test entitlement (owner only)",
      "`/owner premium test-delete` - Delete a test entitlement (owner only)",
      "`/owner premium test-list` - List entitlements, test grants marked (owner only)"
    );
  }
  return lines.join("\n");
}

export async function execute(_client: Client, interaction: CommandInteraction): Promise<void> {
  await withCommandLogging("help", interaction, async () => {
    await interaction.reply({
      content: buildHelpText(),
      flags: MessageFlags.Ephemeral,
    });
  });
}

export default {
  slashCommand,
  execute,
};
