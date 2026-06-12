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
 * within the period, so a late send happens at most once.
 */
export const CATCH_UP_WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * Determines if a guild is due to receive a motivation quote right now.
 *
 * Computes the current period's scheduled occurrence in the guild's timezone
 * and treats the guild as due when that occurrence has passed (within
 * CATCH_UP_WINDOW_MS) and no quote was sent this period yet
 * (via lastMotivationSentAt).
 */
export function isGuildDueForMotivation(guild: Pick<Guild, keyof GuildSchedule>): boolean {
  const { motivationFrequency, motivationTime, motivationDay, timezone: tz, lastMotivationSentAt } = guild;

  const parsed = parseHourMinute(motivationTime);
  if (!parsed) {
    return false;
  }

  const now = dayjs().tz(tz);
  // Note: inside a DST spring-forward gap dayjs shifts the nonexistent local
  // time forward, so such schedules still fire (slightly later) that day.
  let scheduled = now.hour(parsed.hour).minute(parsed.minute).second(0).millisecond(0);

  switch (motivationFrequency) {
    case "Daily":
      // No day constraint for daily
      break;
    case "Weekly":
      if (motivationDay === null) {
        return false;
      }
      scheduled = scheduled.day(motivationDay); // within current Sunday-start week
      break;
    case "Monthly":
      if (motivationDay === null) {
        return false;
      }
      scheduled = scheduled.date(motivationDay);
      break;
  }

  const sinceScheduled = now.valueOf() - scheduled.valueOf();
  if (sinceScheduled < 0 || sinceScheduled > CATCH_UP_WINDOW_MS) {
    return false;
  }

  // Check if already sent during this period
  if (lastMotivationSentAt) {
    const lastSent = dayjs(lastMotivationSentAt).tz(tz);
    const now = dayjs().tz(tz);

    switch (motivationFrequency) {
      case "Daily":
        // Already sent today in guild's timezone
        if (lastSent.isSame(now, "day")) {
          return false;
        }
        break;
      case "Weekly":
        // Already sent this week (locale-aware, Sunday-start week)
        if (lastSent.isSame(now, "week")) {
          return false;
        }
        break;
      case "Monthly":
        // Already sent this month
        if (lastSent.isSame(now, "month")) {
          return false;
        }
        break;
    }
  }

  return true;
}
