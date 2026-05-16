import type { Client, User, EmbedBuilder } from "discord.js";
import { sql } from "drizzle-orm";

import { db } from "../database/index.js";
import { motivationQuotes } from "../database/schema.js";
import type { MotivationQuote } from "../database/schema.js";
import logger from "./logger.js";
import { buildBrandedEmbed, BRAND_FOOTER } from "./embedHelpers.js";

/**
 * Fetch a single random motivation quote in one round-trip.
 * Returns null if the table is empty.
 */
export async function getRandomMotivationQuote(): Promise<MotivationQuote | null> {
  const rows = await db
    .select()
    .from(motivationQuotes)
    .orderBy(sql`random()`)
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve the user who added a quote, returning null if Discord lookup fails.
 */
export async function resolveQuoteAuthor(
  client: Client,
  addedById: string
): Promise<User | null> {
  try {
    return await client.users.fetch(addedById);
  } catch (err) {
    // Log rather than swallow so transient outages, rate limits, and token
    // issues are distinguishable from the expected unknown/deleted-user case.
    logger.warn("Discord", "Failed to resolve quote author", { addedById, error: err });
    return null;
  }
}

/**
 * Build the standard motivation quote embed used by both the slash command
 * and the worker job. Always returns a fresh instance — do not share across sends.
 */
export function buildMotivationEmbed(
  quote: MotivationQuote,
  addedBy: User | null,
  client: Client
): EmbedBuilder {
  return buildBrandedEmbed({
    title: "Motivation quote of the day \u{1F4C5}",
    description: `**"${quote.quote}"**\n by ${quote.author}`,
    footer: {
      text: BRAND_FOOTER,
      iconURL: client.user?.displayAvatarURL(),
    },
  }).setAuthor({
    name: addedBy ? addedBy.username : "Unknown User",
    iconURL: addedBy ? addedBy.displayAvatarURL() : undefined,
  });
}
