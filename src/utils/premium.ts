import type { ChatInputCommandInteraction, CommandInteraction } from "discord.js";

import env from "./env.js";

export interface PremiumDeps {
  env: typeof env;
}

/**
 * Check if premium subscriptions are enabled via environment config.
 */
export function isPremiumEnabled(deps?: PremiumDeps): boolean {
  return (deps?.env ?? env).PREMIUM_ENABLED;
}

/**
 * Get the configured premium SKU ID from environment.
 */
export function getPremiumSkuId(deps?: PremiumDeps): string | undefined {
  return (deps?.env ?? env).DISCORD_PREMIUM_SKU_ID;
}

/**
 * Check if the interaction user has an active entitlement for the configured premium SKU.
 */
export function hasEntitlement(interaction: CommandInteraction | ChatInputCommandInteraction, deps?: PremiumDeps): boolean {
  const skuId = getPremiumSkuId(deps);
  if (!skuId) {
    return false;
  }
  return interaction.entitlements.some((entitlement) => entitlement.skuId === skuId);
}
