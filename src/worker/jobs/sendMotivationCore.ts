import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import type { Client } from "discord.js";
import { and, eq, isNotNull, or, lt, isNull } from "drizzle-orm";

// Type-only imports keep this module evaluable without env/db side effects —
// tests import it directly and inject every dependency.
import type { db } from "../../database/index.js";
import { guilds } from "../../database/schema.js";
import type { Guild } from "../../database/schema.js";
import type { isGuildDueForMotivation } from "../../utils/scheduleEvaluator.js";
import type {
  buildMotivationEmbed,
  getRandomMotivationQuote,
  resolveQuoteAuthor,
} from "./sendMotivationDeps.js";
import type logger from "../../utils/logger.js";

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * Injected dependencies, mirroring setActivityCore: tests pass stubs directly
 * instead of relying on mock.module(), which is process-global in bun:test and
 * makes suites order-dependent across files.
 */
export interface SendMotivationDeps {
  db: typeof db;
  logger: typeof logger;
  isGuildDueForMotivation: typeof isGuildDueForMotivation;
  getRandomMotivationQuote: typeof getRandomMotivationQuote;
  resolveQuoteAuthor: typeof resolveQuoteAuthor;
  buildMotivationEmbed: typeof buildMotivationEmbed;
}

/**
 * Compute the start of the current delivery period in the guild's timezone.
 * Returns a UTC `Date` suitable for comparing against `lastMotivationSentAt`.
 */
function periodStart(guild: Guild): Date {
  const now = dayjs().tz(guild.timezone);
  switch (guild.motivationFrequency) {
    case "Daily":
      return now.startOf("day").utc().toDate();
    case "Weekly":
      return now.startOf("week").utc().toDate();
    case "Monthly":
      return now.startOf("month").utc().toDate();
  }
}

/**
 * Atomically claim a guild for delivery this period. Returns true if this
 * worker won the race, false if another worker (or a previous job tick)
 * already updated the row.
 */
async function claimGuild(_db: SendMotivationDeps["db"], guild: Guild, claimedAt: Date): Promise<boolean> {
  const claimed = await _db
    .update(guilds)
    .set({ lastMotivationSentAt: claimedAt })
    .where(
      and(
        eq(guilds.id, guild.id),
        or(isNull(guilds.lastMotivationSentAt), lt(guilds.lastMotivationSentAt, periodStart(guild)))
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
async function releaseClaim(_db: SendMotivationDeps["db"], guild: Guild, claimedAt: Date): Promise<void> {
  await _db
    .update(guilds)
    .set({ lastMotivationSentAt: guild.lastMotivationSentAt })
    .where(and(eq(guilds.id, guild.id), eq(guilds.lastMotivationSentAt, claimedAt)));
}

export async function sendMotivationCore(client: Client, deps: SendMotivationDeps): Promise<void> {
  const { db: _db, logger: _logger } = deps;

  const allGuilds = await _db
    .select()
    .from(guilds)
    .where(isNotNull(guilds.motivationChannelId));

  if (allGuilds.length === 0) {
    return;
  }

  const dueGuilds = allGuilds.filter(deps.isGuildDueForMotivation);
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

  const results = await Promise.allSettled(
    dueGuilds.map(async (g): Promise<"sent" | "skipped" | "raced"> => {
      if (!g.motivationChannelId) {
        return "skipped";
      }

      // Atomic claim: only the worker that flips lastMotivationSentAt wins.
      const claimedAt = new Date();
      const won = await claimGuild(_db, g, claimedAt);
      if (!won) {
        return "raced";
      }

      try {
        const channel = await client.channels.fetch(g.motivationChannelId);
        if (!channel || !channel.isTextBased() || channel.isDMBased()) {
          // Keep the claim: an invalid channel is a config problem, not a
          // transient failure — retrying every tick would just spam warnings.
          _logger.warn("Worker", "Motivation channel is not a valid text channel", {
            guildId: g.guildId,
            channelId: g.motivationChannelId,
          });
          return "skipped";
        }

        // Fresh embed per guild so Discord.js cannot mutate a shared instance.
        await channel.send({ embeds: [deps.buildMotivationEmbed(quote, author, client)] });
        return "sent";
      } catch (err) {
        try {
          await releaseClaim(_db, g, claimedAt);
        } catch (releaseErr) {
          _logger.error("Worker", "Failed to release motivation claim", releaseErr, {
            guildId: g.guildId,
          });
        }
        throw err;
      }
    })
  );

  let sent = 0;
  let skipped = 0;
  let raced = 0;
  let failed = 0;

  for (const result of results) {
    if (result.status === "rejected") {
      failed++;
      _logger.error("Worker", "Failed to send motivation to a guild", result.reason);
    } else if (result.value === "sent") {
      sent++;
    } else if (result.value === "raced") {
      raced++;
    } else {
      skipped++;
    }
  }

  _logger.success(
    "Worker",
    `Motivation: sent=${sent} skipped=${skipped} raced=${raced} failed=${failed}`
  );
}
