import type { ChatInputCommandInteraction, CommandInteraction } from "discord.js";

import env from "./env.js";

/**
 * Check if premium subscriptions are enabled via environment config.
 */
export function isPremiumEnabled(): boolean {
  return env.PREMIUM_ENABLED;
}

/**
 * Get the configured premium SKU ID from environment.
 */
export function getPremiumSkuId(): string | undefined {
  return env.DISCORD_PREMIUM_SKU_ID;
}

/**
 * Check if the interaction user has an active entitlement for the configured premium SKU.
 */
export function hasEntitlement(interaction: CommandInteraction | ChatInputCommandInteraction): boolean {
  const skuId = getPremiumSkuId();
  if (!skuId) {
    return false;
  }
  return interaction.entitlements.some((entitlement) => entitlement.skuId === skuId);
}
