import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

import type {
  ChatInputCommandInteraction,
  CommandInteraction,
} from "discord.js";

import env from "./env.js";
import { buildBrandedEmbed } from "./embedHelpers.js";
import { allowsTestEntitlements, isActivePremiumEntitlement } from "./entitlementPolicy.js";

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
  return interaction.entitlements.some((entitlement) =>
    isActivePremiumEntitlement(entitlement, skuId, interaction.guildId, Date.now(), {
      allowTest: allowsTestEntitlements(env.NODE_ENV),
    })
  );
}

interface UpsellEmbedOptions {
  title: string;
  description: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footerText?: string;
}

/**
 * Build a consistent premium-upsell embed + SKU button row. Both are returned
 * so callers can spread them into `interaction.reply({...})`.
 */
export interface PremiumUpsell {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
}

export function buildPremiumUpsell(options: UpsellEmbedOptions): PremiumUpsell {
  const skuId = getPremiumSkuId();

  const embed = buildBrandedEmbed({
    title: options.title,
    description: options.description,
    fields: options.fields,
    // An empty footer is rejected by Discord, so "" means no footer.
    footer: options.footerText || undefined,
  });

  const components: ActionRowBuilder<ButtonBuilder>[] = [];
  if (skuId) {
    components.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setStyle(ButtonStyle.Premium).setSKUId(skuId)
      )
    );
  }

  return { embeds: [embed], components };
}
