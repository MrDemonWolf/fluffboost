import type { ChatInputCommandInteraction, CommandInteraction } from "discord.js";

import env from "./env.js";

/**
 * Check if premium subscriptions are enabled via environment config.
 * Also returns true when test mode is active.
 */
export function isPremiumEnabled(): boolean {
  return env.PREMIUM_ENABLED || env.PREMIUM_TEST_MODE;
}

/**
 * Check if premium test mode is active.
 */
export function isPremiumTestMode(): boolean {
  return env.PREMIUM_TEST_MODE;
}

/**
 * Get the configured premium SKU ID from environment.
 */
export function getPremiumSkuId(): string | undefined {
  return env.DISCORD_PREMIUM_SKU_ID;
}

/**
 * Check if the interaction user has an active entitlement for the configured premium SKU.
 * In test mode, always returns false so you can see the upsell flow.
 */
export function hasEntitlement(interaction: CommandInteraction | ChatInputCommandInteraction): boolean {
  if (isPremiumTestMode()) return false;
  const skuId = getPremiumSkuId();
  if (!skuId) return false;
  return interaction.entitlements.some((entitlement) => entitlement.skuId === skuId);
}
