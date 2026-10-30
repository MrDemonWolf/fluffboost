/** `/owner premium test-create`: grants a server a Discord test entitlement for the Premium SKU. */
import { MessageFlags } from "discord.js";

import type { Client, ChatInputCommandInteraction } from "discord.js";

import { getPremiumSkuId } from "../../../utils/premium.js";
import { requireApplication, requireOwner, requireTestEnvironment } from "../../../utils/ownerGuard.js";
import { withCommandLogging } from "../../../utils/commandErrors.js";

/**
 * Targets the `guild` option or the current server, and replies ephemerally with
 * the new entitlement ID. Owner-only and disabled in production.
 */
export default async function (
  client: Client,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await withCommandLogging(
    "owner premium test-create",
    interaction,
    async () => {
      if (!(await requireOwner(interaction, "owner premium test-create"))) {return;}
      if (!(await requireTestEnvironment(interaction))) {return;}

      const skuId = getPremiumSkuId();
      if (!skuId) {
        await interaction.reply({
          content: "DISCORD_PREMIUM_SKU_ID is not configured.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const guildId = interaction.options.getString("guild") ?? interaction.guildId;
      if (!guildId) {
        await interaction.reply({
          content: "Could not determine guild. Run this in a server or pass a guild ID.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const application = await requireApplication(client, interaction);
      if (!application) {return;}

      const entitlement = await application.entitlements.createTest({
        sku: skuId,
        guild: guildId,
      });

      await interaction.reply({
        content:
          `Test entitlement created for guild \`${guildId}\`\n` +
          `Entitlement ID: \`${entitlement.id}\`\n` +
          `SKU: \`${entitlement.skuId}\``,
        flags: MessageFlags.Ephemeral,
      });
    },
    "Failed to create test entitlement. Check bot logs for details."
  );
}
