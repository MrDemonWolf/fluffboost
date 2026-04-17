import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";
import type { Client } from "discord.js";
import { and, eq, isNotNull, or, lt, isNull } from "drizzle-orm";

import { db } from "../../database/index.js";
import { guilds } from "../../database/schema.js";
import type { Guild } from "../../database/schema.js";
import { isGuildDueForMotivation } from "../../utils/scheduleEvaluator.js";
import { buildMotivationEmbed, getRandomMotivationQuote, resolveQuoteAuthor } from "../../utils/quoteHelpers.js";
import logger from "../../utils/logger.js";

dayjs.extend(utc);
dayjs.extend(timezone);

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
async function claimGuild(guild: Guild): Promise<boolean> {
  const claimed = await db
    .update(guilds)
    .set({ lastMotivationSentAt: new Date() })
    .where(
      and(
        eq(guilds.id, guild.id),
        or(isNull(guilds.lastMotivationSentAt), lt(guilds.lastMotivationSentAt, periodStart(guild)))
      )
    )
    .returning({ id: guilds.id });

  return claimed.length > 0;
}

export default async function sendMotivation(client: Client): Promise<void> {
  const allGuilds = await db
    .select()
    .from(guilds)
    .where(isNotNull(guilds.motivationChannelId));

  if (allGuilds.length === 0) {
    return;
  }

  const dueGuilds = allGuilds.filter(isGuildDueForMotivation);
  if (dueGuilds.length === 0) {
    return;
  }

  logger.info("Worker", `${dueGuilds.length} guild(s) due for motivation out of ${allGuilds.length} total`);

  const quote = await getRandomMotivationQuote();
  if (!quote) {
    logger.warn("Worker", "Motivation table is empty — nothing to send");
    return;
  }

  const author = await resolveQuoteAuthor(client, quote.addedBy);

  const results = await Promise.allSettled(
    dueGuilds.map(async (g): Promise<"sent" | "skipped" | "raced"> => {
      if (!g.motivationChannelId) {
        return "skipped";
      }

      // Atomic claim: only the worker that flips lastMotivationSentAt wins.
      const won = await claimGuild(g);
      if (!won) {
        return "raced";
      }

      const channel = await client.channels.fetch(g.motivationChannelId);
      if (!channel || !channel.isTextBased() || channel.isDMBased()) {
        logger.warn("Worker", "Motivation channel is not a valid text channel", {
          guildId: g.guildId,
          channelId: g.motivationChannelId,
        });
        return "skipped";
      }

      // Fresh embed per guild so Discord.js cannot mutate a shared instance.
      await channel.send({ embeds: [buildMotivationEmbed(quote, author, client)] });
      return "sent";
    })
  );

  let sent = 0;
  let skipped = 0;
  let raced = 0;
  let failed = 0;

  for (const result of results) {
    if (result.status === "rejected") {
      failed++;
      logger.error("Worker", "Failed to send motivation to a guild", result.reason);
    } else if (result.value === "sent") {
      sent++;
    } else if (result.value === "raced") {
      raced++;
    } else {
      skipped++;
    }
  }

  logger.success(
    "Worker",
    `Motivation: sent=${sent} skipped=${skipped} raced=${raced} failed=${failed}`
  );
}
