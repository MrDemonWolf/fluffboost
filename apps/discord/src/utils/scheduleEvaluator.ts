import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

import type { Guild, MotivationFrequency } from "../database/schema.js";

dayjs.extend(utc);
dayjs.extend(timezone);

interface GuildSchedule {
  motivationFrequency: MotivationFrequency;
  motivationTime: string; // HH:mm
  motivationDay: number | null;
  timezone: string;
  lastMotivationSentAt: Date | null;
}

/**
 * Parse an "HH:mm" string into validated hour/minute components.
 * Returns null on any malformed or out-of-range input — the caller should
 * treat that guild as not-due rather than coercing to a default time.
 */
export function parseHourMinute(value: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    return null;
  }
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

/**
 * Get the current time components in a specific timezone using dayjs.
 *
 * Note on weekly dedup: dayjs's `isSame(now, "week")` uses Sunday as the
 * week start regardless of guild locale. This is intentional and consistent
 * for the bot's purpose (guarding against duplicate sends within a 7-day window).
 */
export function getCurrentTimeInTimezone(tz: string) {
  const now = dayjs().tz(tz);
  return {
    hour: now.hour(),
    minute: now.minute(),
    dayOfWeek: now.day(), // 0 = Sunday, 6 = Saturday
    dayOfMonth: now.date(), // 1-31
  };
}

/**
 * How far past the scheduled time a send may still fire. A worker tick can be
 * delayed or skipped entirely (deploys, Redis blips, shard respawns resetting
 * the repeatable slot); an exact-minute match would silently drop that
 * period's send for every affected guild. The window lets late ticks catch up
 * without re-delivering long-stale slots. lastMotivationSentAt still dedupes
 * against the occurrence, so a late send happens at most once.
 */
export const CATCH_UP_WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * Resolve the most recent scheduled occurrence at or before now in the
 * guild's timezone. This single anchor drives the catch-up window, the
 * lastMotivationSentAt dedupe, AND the worker's atomic claim — anchoring all
 * three to the same instant is what keeps delayed sends correct across
 * midnight/week/month boundaries (e.g. a daily 23:59 slot evaluated at 00:03
 * must resolve to *yesterday's* 23:59, not today's).
 *
 * Returns null for malformed times or missing day configuration.
 */
export function mostRecentScheduledOccurrence(
  guild: Pick<Guild, "motivationFrequency" | "motivationTime" | "motivationDay" | "timezone">
): Date | null {
  const parsed = parseHourMinute(guild.motivationTime);
  if (!parsed) {
    return null;
  }

  const now = dayjs().tz(guild.timezone);
  // Note: inside a DST spring-forward gap dayjs shifts the nonexistent local
  // time forward, so such schedules still fire (slightly later) that day.
  let occurrence = now.hour(parsed.hour).minute(parsed.minute).second(0).millisecond(0);

  switch (guild.motivationFrequency) {
    case "Daily":
      if (occurrence.isAfter(now)) {
        occurrence = occurrence.subtract(1, "day");
      }
      break;
    case "Weekly":
      if (guild.motivationDay === null) {
        return null;
      }
      occurrence = occurrence.day(guild.motivationDay); // within current Sunday-start week
      if (occurrence.isAfter(now)) {
        occurrence = occurrence.subtract(7, "day");
      }
      break;
    case "Monthly":
      if (guild.motivationDay === null) {
        return null;
      }
      occurrence = occurrence.date(guild.motivationDay);
      if (occurrence.isAfter(now)) {
        // motivationDay is constrained to 1-28, so it exists in every month.
        occurrence = occurrence.subtract(1, "month").date(guild.motivationDay);
      }
      break;
  }

  return occurrence.toDate();
}

/**
 * Determines if a guild is due to receive a motivation quote right now: the
 * most recent scheduled occurrence is within CATCH_UP_WINDOW_MS, and nothing
 * has been sent at or after that occurrence yet.
 */
export function isGuildDueForMotivation(guild: Pick<Guild, keyof GuildSchedule>): boolean {
  const occurrence = mostRecentScheduledOccurrence(guild);
  if (!occurrence) {
    return false;
  }

  const sinceScheduled = dayjs().valueOf() - occurrence.getTime();
  if (sinceScheduled > CATCH_UP_WINDOW_MS) {
    return false;
  }

  // Already delivered for this occurrence (sends always stamp at/after it).
  const { lastMotivationSentAt } = guild;
  if (lastMotivationSentAt && lastMotivationSentAt.getTime() >= occurrence.getTime()) {
    return false;
  }

  return true;
}
