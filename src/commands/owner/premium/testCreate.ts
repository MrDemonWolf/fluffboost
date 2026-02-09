import { MessageFlags } from "discord.js";

import type { Client, CommandInteraction, CommandInteractionOptionResolver } from "discord.js";

import logger from "../../../utils/logger.js";
import env from "../../../utils/env.js";
import { getPremiumSkuId } from "../../../utils/premium.js";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
): Promise<void> {
  try {
    logger.commands.executing(
      "owner premium test-create",
      interaction.user.username,
      interaction.user.id
    );

    if (interaction.user.id !== env.OWNER_ID) {
      logger.commands.unauthorized(
        "owner premium test-create",
        interaction.user.username,
        interaction.user.id
      );
      await interaction.reply({
        content: "Only the bot owner can use this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const skuId = getPremiumSkuId();
    if (!skuId) {
      await interaction.reply({
        content: "DISCORD_PREMIUM_SKU_ID is not configured.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const targetUser = options.getUser("user") ?? interaction.user;

    if (!client.application) {
      await interaction.reply({
        content: "Bot application is not ready. Please try again in a moment.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const entitlement = await client.application.entitlements.createTest({
      sku: skuId,
      user: targetUser.id,
    });

    await interaction.reply({
      content:
        `Test entitlement created for **${targetUser.username}** (${targetUser.id})\n` +
        `Entitlement ID: \`${entitlement.id}\`\n` +
        `SKU: \`${entitlement.skuId}\``,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "owner premium test-create",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    logger.commands.error(
      "owner premium test-create",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error(
      "Discord - Command",
      "Error executing owner premium test-create command",
      err,
      {
        user: { username: interaction.user.username, id: interaction.user.id },
        command: "owner premium test-create",
      }
    );

    if (!interaction.replied) {
      await interaction.reply({
        content: "Failed to create test entitlement. Check bot logs for details.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
