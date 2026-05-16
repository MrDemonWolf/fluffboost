import { EmbedBuilder } from "discord.js";
import type { APIEmbedField } from "discord.js";

export const BRAND_COLOR = 0xfadb7f;
export const BRAND_FOOTER = "Powered by MrDemonWolf, Inc.";

export interface BrandedEmbedOptions {
  title?: string;
  description?: string;
  fields?: APIEmbedField[];
  color?: number;
  footer?: string | { text: string; iconURL?: string };
  timestamp?: boolean;
}

/**
 * Build an EmbedBuilder pre-set with the FluffBoost brand color and
 * (optionally) brand footer. Returns a fresh instance — never share.
 *
 * Pass `footer: false`-style omission by simply not providing it; pass a
 * string to use that text with brand color; pass an object for full control.
 */
export function buildBrandedEmbed(options: BrandedEmbedOptions = {}): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(options.color ?? BRAND_COLOR);

  if (options.title) {
    embed.setTitle(options.title);
  }
  if (options.description) {
    embed.setDescription(options.description);
  }
  if (options.fields && options.fields.length > 0) {
    embed.addFields(options.fields);
  }
  if (options.footer !== undefined) {
    if (typeof options.footer === "string") {
      embed.setFooter({ text: options.footer });
    } else {
      embed.setFooter(options.footer);
    }
  }
  if (options.timestamp) {
    embed.setTimestamp();
  }

  return embed;
}
