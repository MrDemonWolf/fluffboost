/** Brand colors and embed builders shared by every command and job that posts an embed. */
import { EmbedBuilder, escapeMarkdown } from "discord.js";
import type { APIEmbedField } from "discord.js";

const BRAND_COLOR = 0xfadb7f;
/** Discord's own green/red, used for approved/rejected suggestion notices. */
export const SUCCESS_COLOR = 0x57f287;
export const DANGER_COLOR = 0xed4245;
export const BRAND_FOOTER = "Powered by MrDemonWolf, Inc.";

/** Discord's hard limit for an embed field value. */
const EMBED_FIELD_VALUE_LIMIT = 1024;

/**
 * Render user-submitted text literally in an embed field, so reviewers see
 * masked links, headings and other markdown exactly as typed. Truncates after
 * escaping because the backslashes count toward the field limit.
 */
export function escapeFieldValue(text: string): string {
  return escapeMarkdown(text, {
    heading: true,
    bulletedList: true,
    numberedList: true,
    maskedLink: true,
  }).slice(0, EMBED_FIELD_VALUE_LIMIT);
}

/** Every option is optional; unset ones are simply not applied. `timestamp: true` stamps the current time. */
export interface BrandedEmbedOptions {
  title?: string;
  description?: string;
  fields?: APIEmbedField[];
  color?: number;
  footer?: string | { text: string; iconURL?: string };
  timestamp?: boolean;
}

/**
 * Build an EmbedBuilder pre-set with the FluffBoost brand color (or `color`).
 * Returns a fresh instance — never share one across sends.
 *
 * Omit `footer` for no footer; a string sets the footer text, an object sets
 * text and icon. Field values are cut to 1024 characters and an empty value
 * becomes "(empty)", since Discord rejects both.
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
