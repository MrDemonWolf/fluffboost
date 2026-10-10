import type { Client } from "discord.js";
import { and, eq, isNotNull, or, lt, isNull } from "drizzle-orm";
import { z } from "zod";

// Type-only imports keep this module evaluable without env/db side effects —
// tests import it directly and inject every dependency.
import type { db } from "../../database/index.js";
import { guilds } from "../../database/schema.js";
import type { Guild } from "../../database/schema.js";
import type {
  buildMotivationEmbed,
  getRandomMotivationQuote,
  resolveQuoteAuthor,
} from "../../utils/quoteHelpers.js";
import type logger from "../../utils/logger.js";

/** The Guild columns delivery needs; the tick selects only these. */
export type DeliveryGuild = Pick<
  Guild,
  | "id"
  | "guildId"
  | "motivationChannelId"
  | "motivationFrequency"
  | "motivationTime"
  | "motivationDay"
  | "timezone"
  | "lastMotivationSentAt"
  | "isPremium"
>;

/**
 * Injected dependencies, mirroring setActivityCore: tests pass stubs directly
 * instead of relying on mock.module(), which is process-global in bun:test and
 * makes suites order-dependent across files.
 */
export interface SendMotivationDeps {
  db: typeof db;
  logger: typeof logger;
  /**
   * The scheduled occurrence this guild is due for right now, or null when it
   * is not due. Resolved once per guild per tick and reused for the claim.
   */
  dueOccurrence: (guild: DeliveryGuild) => Date | null;
  getRandomMotivationQuote: typeof getRandomMotivationQuote;
  resolveQuoteAuthor: typeof resolveQuoteAuthor;
  buildMotivationEmbed: typeof buildMotivationEmbed;
}

/**
 * Guilds are claimed and sent this many at a time. Claims are at-most-once
 * (a crash after the claim but before the send drops that occurrence), so
 * bounding the batch bounds what a deploy or crash mid-burst can lose; the
 * rest stay unclaimed and roll over to the next tick inside the catch-up
 * window. It also keeps one tick from flooding the DB pool and REST queue.
 */
export const DELIVERY_CHUNK_SIZE = 25;

interface DueDelivery {
  guild: DeliveryGuild;
  channelId: string;
  occurrence: Date;
}

type DeliveryResult = "sent" | "skipped" | "raced";

/**
 * DiscordAPIError/HTTPError fields parsed from a send failure (keeps this module
 * free of runtime discord.js imports). Never throws: anything else parses to {}.
 */
const sendErrorDetails = z
  .object({
    code: z.union([z.number(), z.string()]).optional().catch(undefined),
    status: z.number().optional().catch(undefined),
  })
  .catch({});

/**
 * Deterministic per guild+occurrence (Discord caps nonces at 25 chars: 16 hex
 * chars of the row UUID + the occurrence in base36). With enforceNonce,
 * Discord returns the existing message for a repeated nonce within its dedupe
 * window, so REST-level retries and a re-send after a released claim cannot
 * post the same quote twice.
 */
export function deliveryNonce(guild: Pick<DeliveryGuild, "id">, occurrence: Date): string {
  return `${guild.id.replaceAll("-", "").slice(0, 16)}${occurrence.getTime().toString(36)}`.slice(0, 25);
}

/**
 * Atomically claim a guild for this scheduled occurrence. Anchored to the
 * same occurrence the evaluator used for due-ness, so a delayed send that
 * crosses a midnight/week/month boundary still claims (and dedupes) against
 * the slot it is actually delivering. Returns true if this worker won the
 * race, false if another worker (or a previous tick) already delivered it.
 */
async function claimGuild(
  _db: SendMotivationDeps["db"],
  guild: DeliveryGuild,
  claimedAt: Date,
  occurrence: Date
): Promise<boolean> {
  const claimed = await _db
    .update(guilds)
    .set({ lastMotivationSentAt: claimedAt })
    .where(
      and(
        eq(guilds.id, guild.id),
        or(isNull(guilds.lastMotivationSentAt), lt(guilds.lastMotivationSentAt, occurrence))
      )
    )
    .returning({ id: guilds.id });

  return claimed.length > 0;
}

/**
 * Roll a failed delivery's claim back so the next tick inside the catch-up
 * window can retry, instead of a transient send error eating the whole
 * period. Only releases if the row still carries our claim timestamp.
 */
async function releaseClaim(_db: SendMotivationDeps["db"], guild: DeliveryGuild, claimedAt: Date): Promise<void> {
  await _db
    .update(guilds)
    .set({ lastMotivationSentAt: guild.lastMotivationSentAt })
    .where(and(eq(guilds.id, guild.id), eq(guilds.lastMotivationSentAt, claimedAt)));
}

export async function sendMotivationCore(
  client: Client,
  deps: SendMotivationDeps,
  signal?: AbortSignal
): Promise<void> {
  const { db: _db, logger: _logger } = deps;

  const allGuilds: DeliveryGuild[] = await _db
    .select({
      id: guilds.id,
      guildId: guilds.guildId,
      motivationChannelId: guilds.motivationChannelId,
      motivationFrequency: guilds.motivationFrequency,
      motivationTime: guilds.motivationTime,
      motivationDay: guilds.motivationDay,
      timezone: guilds.timezone,
      lastMotivationSentAt: guilds.lastMotivationSentAt,
      isPremium: guilds.isPremium,
    })
    .from(guilds)
    .where(isNotNull(guilds.motivationChannelId));

  if (allGuilds.length === 0) {
    return;
  }

  // Evaluate each row in isolation: one corrupt schedule (bad timezone or
  // day written outside /setup schedule) must not abort every guild's tick.
  const dueGuilds: DueDelivery[] = [];
  for (const guild of allGuilds) {
    try {
      const occurrence = deps.dueOccurrence(guild);
      if (occurrence && guild.motivationChannelId) {
        dueGuilds.push({ guild, channelId: guild.motivationChannelId, occurrence });
      }
    } catch (err) {
      _logger.warn("Worker", "Invalid motivation schedule — skipping guild", {
        guildId: guild.guildId,
        error: err,
      });
    }
  }

  if (dueGuilds.length === 0) {
    return;
  }

  _logger.info("Worker", `${dueGuilds.length} guild(s) due for motivation out of ${allGuilds.length} total`);

  const quote = await deps.getRandomMotivationQuote();
  if (!quote) {
    _logger.warn("Worker", "Motivation table is empty — nothing to send");
    return;
  }

  const author = await deps.resolveQuoteAuthor(client, quote.addedBy);

  // A 401 means the bot token itself was rejected: no guild can succeed, so
  // stop claiming and release instead of marking occurrences delivered.
  let unauthorized = false;

  const deliver = async ({ guild: g, channelId, occurrence }: DueDelivery): Promise<DeliveryResult> => {
    // Claim right before the send so at most one chunk is ever claimed-but-unsent.
    const claimedAt = new Date();
    const won = await claimGuild(_db, g, claimedAt, occurrence);
    if (!won) {
      return "raced";
    }

    try {
      const channel = await client.channels.fetch(channelId, { allowUnknownGuild: true });
      if (!channel || !channel.isTextBased() || channel.isDMBased()) {
        // Keep the claim: an invalid channel is a config problem, not a
        // transient failure — retrying every tick would just spam warnings.
        _logger.warn("Worker", "Motivation channel is not a valid text channel", {
          guildId: g.guildId,
          channelId,
        });
        return "skipped";
      }

      // Fresh embed per guild so Discord.js cannot mutate a shared instance.
      await channel.send({
        embeds: [deps.buildMotivationEmbed(quote, author, client)],
        nonce: deliveryNonce(g, occurrence),
        enforceNonce: true,
      });
      return "sent";
    } catch (err) {
      const { code, status } = sendErrorDetails.parse(err);
      if (status === 401) {
        unauthorized = true;
      } else if (status !== undefined && status >= 400 && status < 500 && status !== 429) {
        // Permanent rejections (Unknown Channel 10003, Missing Access 50001,
        // Missing Permissions 50013, bad payload 50035, ...): @discordjs/rest
        // never retries these, and releasing would re-POST every tick for the
        // rest of the catch-up window and burn Discord's invalid-request budget.
        _logger.warn("Worker", "Motivation send rejected by Discord — keeping claim", {
          guildId: g.guildId,
          channelId,
          code,
          status,
        });
        return "skipped";
      }

      // Transient (5xx/HTTPError, network, timeout/abort, 429) or 401: release
      // so a later tick inside the catch-up window can retry.
      try {
        await releaseClaim(_db, g, claimedAt);
      } catch (releaseErr) {
        _logger.error("Worker", "Failed to release motivation claim", releaseErr, {
          guildId: g.guildId,
        });
      }
      throw err;
    }
  };

  let sent = 0;
  let skipped = 0;
  let raced = 0;
  let failed = 0;
  let deferred = 0;

  for (let start = 0; start < dueGuilds.length; start += DELIVERY_CHUNK_SIZE) {
    if (signal?.aborted || unauthorized) {
      // Unclaimed guilds stay due and roll over to the next tick.
      deferred = dueGuilds.length - start;
      break;
    }

    const chunk = dueGuilds.slice(start, start + DELIVERY_CHUNK_SIZE);
    const results = await Promise.allSettled(chunk.map(deliver));

    results.forEach((result, i) => {
      if (result.status === "rejected") {
        failed++;
        const item = chunk[i];
        const { code, status } = sendErrorDetails.parse(result.reason);
        _logger.error("Worker", "Failed to send motivation to a guild", result.reason, {
          guildId: item?.guild.guildId,
          channelId: item?.channelId,
          code,
          status,
        });
      } else if (result.value === "sent") {
        sent++;
      } else if (result.value === "raced") {
        raced++;
      } else {
        skipped++;
      }
    });
  }

  if (unauthorized) {
    _logger.error("Worker", "Discord rejected the bot token (401) — motivation run aborted, claims released");
  } else if (deferred > 0) {
    _logger.warn("Worker", `Motivation run stopped early; ${deferred} guild(s) deferred to the next tick`);
  }

  _logger.success(
    "Worker",
    `Motivation: sent=${sent} skipped=${skipped} raced=${raced} failed=${failed} deferred=${deferred}`
  );
}
