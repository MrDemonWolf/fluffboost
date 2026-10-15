/**
 * Premium helpers for commands: the config toggle, the live entitlement check on an interaction and the shared
 * upsell message. Background delivery reads the stored `Guild.isPremium` flag instead (see premiumReconciliation).
 */
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
 * Whether Premium gating is on (PREMIUM_ENABLED). When false, custom schedules
 * are open to every server and no entitlement handling runs.
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
 * Whether the interaction carries an active entitlement for the configured SKU
 * that belongs to the current server. Only a subscription for this guild
 * counts (not one held by the user elsewhere), so it is always false in DMs.
 * Test entitlements are ignored in production.
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

/** Upsell text; an empty or missing `footerText` means no footer. */
interface UpsellEmbedOptions {
  title: string;
  description: string;
  fields?: { name: string; value: string; inline?: boolean }[];
  footerText?: string;
}

/** Reply payload fragment; spread it into `interaction.reply({...})`. */
export interface PremiumUpsell {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
}

/**
 * Build a consistent premium-upsell embed plus the SKU purchase button row.
 * Without a configured SKU the row is omitted and only the embed is sent.
 */
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
