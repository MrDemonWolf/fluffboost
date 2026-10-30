import { EmbedBuilder, escapeMarkdown } from "discord.js";
import type { APIEmbedField } from "discord.js";

const BRAND_COLOR = 0xfadb7f;
export const SUCCESS_COLOR = 0x57f287;
export const DANGER_COLOR = 0xed4245;
export const BRAND_FOOTER = "Powered by MrDemonWolf, Inc.";

const EMBED_FIELD_VALUE_LIMIT = 1024;
const EMBED_DESCRIPTION_LIMIT = 4096;

/**
 * Render user-typed text literally, so readers see masked links, headings and
 * other markdown exactly as typed instead of a clickable disguised link. Use
 * for any user text placed in an embed description; fields use
 * `escapeFieldValue`.
 */
export function escapeUserText(text: string): string {
  return escapeMarkdown(text, {
    heading: true,
    bulletedList: true,
    numberedList: true,
    maskedLink: true,
  });
}

/**
 * `escapeUserText` for an embed field. Truncates after escaping because the
 * backslashes count toward the field limit.
 */
export function escapeFieldValue(text: string): string {
  return escapeUserText(text).slice(0, EMBED_FIELD_VALUE_LIMIT);
}

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
    // Escaped user text can outgrow the limit; discord.js throws past it.
    embed.setDescription(options.description.slice(0, EMBED_DESCRIPTION_LIMIT));
  }
  if (options.fields && options.fields.length > 0) {
    // Old stored quotes and free-form review reasons can exceed field limits.
    embed.addFields(options.fields.map((field) => ({
      ...field, value: field.value.slice(0, EMBED_FIELD_VALUE_LIMIT) || "(empty)",
    })));
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
