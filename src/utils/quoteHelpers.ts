import { EmbedBuilder } from "discord.js";
import type { Client, User } from "discord.js";
import { sql } from "drizzle-orm";

import { db } from "../database/index.js";
import { motivationQuotes } from "../database/schema.js";
import type { MotivationQuote } from "../database/schema.js";
import logger from "./logger.js";

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
  return new EmbedBuilder()
    .setColor(0xfadb7f)
    .setTitle("Motivation quote of the day \u{1F4C5}")
    .setDescription(`**"${quote.quote}"**\n by ${quote.author}`)
    .setAuthor({
      name: addedBy ? addedBy.username : "Unknown User",
      iconURL: addedBy ? addedBy.displayAvatarURL() : undefined,
    })
    .setFooter({
      text: "Powered by MrDemonWolf, Inc.",
      iconURL: client.user?.displayAvatarURL(),
    });
}
