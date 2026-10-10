import { InteractionContextType, MessageFlags, SlashCommandBuilder } from "discord.js";

import type { Client, CommandInteraction } from "discord.js";
import { eq } from "drizzle-orm";

import { db } from "../database/index.js";
import { guilds } from "../database/schema.js";
import logger from "../utils/logger.js";
import { withCommandLogging } from "../utils/commandErrors.js";
import { requireGuildId } from "../utils/permissions.js";
import { buildPremiumUpsell, hasEntitlement, isPremiumEnabled } from "../utils/premium.js";
import { buildBrandedEmbed, SUCCESS_COLOR } from "../utils/embedHelpers.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("premium")
  .setDescription("View premium subscription info and status")
  // Premium is a per-server subscription; hides the command from bot DMs.
  .setContexts(InteractionContextType.Guild);

export async function execute(_client: Client, interaction: CommandInteraction): Promise<void> {
  await withCommandLogging("premium", interaction, async () => {
    if (!isPremiumEnabled()) {
      await interaction.reply({
        content: "Premium subscriptions are not currently available.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Stale global registrations can still reach DMs, where there is no server
    // to show a subscription for.
    const guildId = await requireGuildId(interaction);
    if (!guildId) {
      return;
    }

    if (hasEntitlement(interaction)) {
      const embed = buildBrandedEmbed({
        color: SUCCESS_COLOR,
        title: "Premium Active",
        description: "This server has an active Premium subscription. An administrator can use /setup schedule to customize quote delivery. Thank you for supporting FluffBoost!",
        fields: [{ name: "Status", value: "Active", inline: true }],
        footer: "Manage your subscription in User Settings > Subscriptions",
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });

      // Self-heal: this reply reads live entitlements, but delivery reads the
      // cached isPremium flag, which a missed or failed entitlement event can
      // leave stale. Best-effort; the reconciliation loop is the backstop.
      try {
        await db.update(guilds).set({ isPremium: true }).where(eq(guilds.guildId, guildId));
      } catch (err) {
        logger.commands.error("premium", interaction.user.username, interaction.user.id, err, guildId);
      }
      return;
    }

    const upsell = buildPremiumUpsell({
      title: "FluffBoost Premium",
      description: "Customize this server's quote schedule and support FluffBoost development.",
      fields: [
        { name: "Billing", value: "Discord checkout shows the current price and renewal terms.", inline: true },
        {
          name: "Benefits",
          value: ["- Custom quote time and timezone", "- Daily, weekly, or monthly delivery", "- Support ongoing development"].join("\n"),
        },
      ],
      footerText: "Subscribe to support FluffBoost development!",
    });

    await interaction.reply({ ...upsell, flags: MessageFlags.Ephemeral });
  });
}

export default { slashCommand, execute };
