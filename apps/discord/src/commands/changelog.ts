import { SlashCommandBuilder, MessageFlags } from "discord.js";

import type { Client, CommandInteraction } from "discord.js";

import env from "../utils/env.js";
import { withCommandLogging } from "../utils/commandErrors.js";
import { buildBrandedEmbed, BRAND_FOOTER } from "../utils/embedHelpers.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("changelog")
  .setDescription("See the latest changes to the bot");

export async function execute(_client: Client, interaction: CommandInteraction): Promise<void> {
  await withCommandLogging("changelog", interaction, async () => {
    const embed = buildBrandedEmbed({
      title: `FluffBoost Changelog - v${env.VERSION}`,
      description: "Premium subscriptions and custom quote scheduling are here!",
      fields: [
        {
          name: "Premium Subscriptions",
          value:
            "FluffBoost now offers premium subscriptions! " +
            "Use `/premium` to view subscription info and unlock premium features for your server.",
        },
        {
          name: "Custom Quote Scheduling (Premium)",
          value:
            "Premium servers can customize their quote delivery with `/setup schedule`.\n" +
            "- Choose **daily**, **weekly**, or **monthly** delivery\n" +
            "- Pick your preferred **time** and **timezone**\n" +
            "- Select which **day** for weekly or monthly schedules",
        },
        {
          name: "Per-Server Schedules",
          value:
            "Every server now has its own independent quote schedule. " +
            "Free servers keep the default daily 8:00 AM (America/Chicago) delivery.",
        },
        {
          name: "New Commands",
          value:
            "`/premium` - View your premium subscription status\n" +
            "`/setup schedule` - Customize quote delivery (premium)\n" +
            "`/owner premium test-create` - Create a test entitlement (owner only)\n" +
            "`/owner premium test-delete` - Delete a test entitlement (owner only)",
        },
      ],
      timestamp: true,
      footer: BRAND_FOOTER,
    });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  });
}

export default {
  slashCommand,
  execute,
};
