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

interface UpsellEmbedOptions {
  title?: string;
  description?: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footerText?: string;
}

/**
 * Build a consistent premium-upsell embed + SKU button row. Both are returned
 * so callers can spread them into `interaction.reply({...})`.
 */
export function buildPremiumUpsell(options: UpsellEmbedOptions = {}): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const skuId = getPremiumSkuId();

  const embed = new EmbedBuilder()
    .setColor(0xfadb7f)
    .setTitle(options.title ?? "FluffBoost Premium")
    .setDescription(
      options.description ??
        "Upgrade to Premium to unlock exclusive features and support FluffBoost development!"
    );

  if (options.fields && options.fields.length > 0) {
    embed.addFields(options.fields);
  }

  if (options.footerText) {
    embed.setFooter({ text: options.footerText });
  }

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
