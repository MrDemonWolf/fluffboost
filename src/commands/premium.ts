import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from "discord.js";

import type { Client, CommandInteraction } from "discord.js";

import { withCommandLogging } from "../utils/commandErrors.js";
import { buildPremiumUpsell, hasEntitlement, isPremiumEnabled } from "../utils/premium.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("premium")
  .setDescription("View premium subscription info and status");

export async function execute(_client: Client, interaction: CommandInteraction): Promise<void> {
  await withCommandLogging("premium", interaction, async () => {
    if (!isPremiumEnabled()) {
      await interaction.reply({
        content: "Premium subscriptions are not currently available.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (hasEntitlement(interaction)) {
      const embed = new EmbedBuilder()
        .setColor(0x57f287)
        .setTitle("Premium Active")
        .setDescription("You have an active premium subscription! Thank you for supporting FluffBoost.")
        .addFields({ name: "Status", value: "Active", inline: true })
        .setFooter({ text: "Manage your subscription in User Settings > Subscriptions" });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    const upsell = buildPremiumUpsell({
      title: "FluffBoost Premium",
      description: "Upgrade to Premium to unlock exclusive features!",
      fields: [
        { name: "Price", value: "$1.99/month", inline: true },
        {
          name: "Benefits",
          value: ["- Priority quote delivery", "- Exclusive premium quotes", "- Early access to new features"].join("\n"),
        },
      ],
      footerText: "Subscribe to support FluffBoost development!",
    });

    await interaction.reply({ ...upsell, flags: MessageFlags.Ephemeral });
  });
}

export default { slashCommand, execute };
