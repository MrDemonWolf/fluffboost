import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

import type { Guild, MotivationFrequency } from "../database/schema.js";
import { DEFAULT_GUILD_SCHEDULE } from "./scheduleConfig.js";

dayjs.extend(utc);
dayjs.extend(timezone);

interface GuildSchedule {
  motivationFrequency: MotivationFrequency;
  motivationTime: string; // HH:mm
  motivationDay: number | null;
  timezone: string;
  lastMotivationSentAt: Date | null;
}

/** Keep saved customization while expired subscriptions use the free schedule. */
export function effectiveGuildSchedule(
  guild: GuildSchedule & { isPremium: boolean }, premiumEnabled: boolean
): GuildSchedule {
  if (!premiumEnabled || guild.isPremium) {
    return guild;
  }
  return {
    ...DEFAULT_GUILD_SCHEDULE,
    lastMotivationSentAt: guild.lastMotivationSentAt,
  };
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
 * How far past the scheduled time a send may still fire. A worker tick can be
 * delayed or skipped entirely (deploys, Redis blips, shard respawns resetting
 * the repeatable slot); an exact-minute match would silently drop that
 * period's send for every affected guild. The window lets late ticks catch up
 * without re-delivering long-stale slots. lastMotivationSentAt still dedupes
 * against the occurrence, so a late send happens at most once.
 */
const CATCH_UP_WINDOW_MS = 6 * 60 * 60 * 1000;

/**
 * Resolve the most recent scheduled occurrence at or before now in the
 * guild's timezone. This single anchor drives the catch-up window, the
 * lastMotivationSentAt dedupe, AND the worker's atomic claim — anchoring all
 * three to the same instant is what keeps delayed sends correct across
 * midnight/week/month boundaries (e.g. a daily 23:59 slot evaluated at 00:03
 * must resolve to *yesterday's* 23:59, not today's).
 *
 * Returns null for malformed times, missing or out-of-range day configuration
 * (Weekly 0-6, Monthly 1-28) and timezones Intl rejects. Only /setup schedule
 * validates these columns, so rows written any other way (db:studio, raw SQL)
 * must degrade to "not due" instead of throwing or resolving to a future slot.
 */
export function mostRecentScheduledOccurrence(
  guild: Pick<Guild, "motivationFrequency" | "motivationTime" | "motivationDay" | "timezone">
): Date | null {
  const parsed = parseHourMinute(guild.motivationTime);
  if (!parsed) {
    return null;
  }

  const day = guild.motivationDay;
  if (guild.motivationFrequency === "Weekly" && (day === null || !Number.isInteger(day) || day < 0 || day > 6)) {
    return null;
  }
  if (guild.motivationFrequency === "Monthly" && (day === null || !Number.isInteger(day) || day < 1 || day > 28)) {
    return null;
  }

  try {
    const now = dayjs().tz(guild.timezone);
    // Calendar arithmetic happens in UTC so selecting a date cannot retain
    // today's offset for an occurrence on the other side of a DST transition.
    let date = dayjs.utc(now.format("YYYY-MM-DD"));
    if (day !== null && guild.motivationFrequency === "Weekly") {
      date = date.day(day);
    } else if (day !== null && guild.motivationFrequency === "Monthly") {
      date = date.date(day);
    }
    // Resolve the offset for this date. Nonexistent spring times move forward.
    const resolve = () => dayjs.tz(
      `${date.format("YYYY-MM-DD")} ${guild.motivationTime}`, guild.timezone
    );
    let occurrence = resolve();
    if (occurrence.valueOf() > now.valueOf()) {
      switch (guild.motivationFrequency) {
        case "Daily": date = date.subtract(1, "day"); break;
        case "Weekly": date = date.subtract(7, "day"); break;
        // The configured day is 1-28, so subtraction preserves it in every month.
        case "Monthly": date = date.subtract(1, "month"); break;
      }
      occurrence = resolve();
    }
    return occurrence.toDate();
  } catch (err) {
    // Intl throws RangeError for unknown zones ("GMT+5", "Central").
    if (err instanceof RangeError) {
      return null;
    }
    throw err;
  }
}

/**
 * Whether a guild is due for an already-resolved occurrence: the occurrence
 * is in the past but within CATCH_UP_WINDOW_MS, and nothing has been sent at
 * or after it yet. Split out so the worker can resolve each distinct schedule
 * once per tick and reuse the occurrence for the due check and the claim.
 */
export function isDueForOccurrence(
  guild: Pick<Guild, "timezone" | "lastMotivationSentAt">,
  occurrence: Date
): boolean {
  const sinceScheduled = dayjs().valueOf() - occurrence.getTime();
  // A future occurrence is never due (defensive: the resolver only returns
  // past slots, but a future one would otherwise pass the claim every tick).
  if (sinceScheduled < 0 || sinceScheduled > CATCH_UP_WINDOW_MS) {
    return false;
  }

  // Already delivered for this occurrence (sends always stamp at/after it).
  const { lastMotivationSentAt } = guild;
  if (lastMotivationSentAt && lastMotivationSentAt.getTime() >= occurrence.getTime()) {
    return false;
  }

  // During the repeated autumn DST hour, UTC advances while the wall clock
  // moves backward. A prior delivery at or after this local wall-clock slot
  // already delivered it. Compare the full local date AND time, so a late
  // midnight catch-up does not suppress the next evening's legitimate slot.
  if (lastMotivationSentAt) {
    const lastLocal = dayjs(lastMotivationSentAt).tz(guild.timezone).format("YYYY-MM-DDTHH:mm:ss.SSS");
    const scheduledLocal = dayjs(occurrence).tz(guild.timezone).format("YYYY-MM-DDTHH:mm:ss.SSS");
    if (lastLocal >= scheduledLocal) {
      return false;
    }
  }

  return true;
}

/**
 * Build a per-tick resolver returning the occurrence a guild is due for (or
 * null). Nearly every free guild shares DEFAULT_GUILD_SCHEDULE, so each
 * distinct schedule's occurrence is resolved once and cached; the due check
 * still runs per guild because it depends on that row's lastMotivationSentAt.
 * Create a fresh resolver for every tick so the cache never spans minutes.
 */
export function createDueOccurrenceResolver(
  premiumEnabled: boolean
): (guild: GuildSchedule & { isPremium: boolean }) => Date | null {
  const occurrences = new Map<string, Date | null>();
  return (guild) => {
    const schedule = effectiveGuildSchedule(guild, premiumEnabled);
    const key = [
      schedule.motivationFrequency, schedule.motivationTime, schedule.motivationDay, schedule.timezone,
    ].join("|");
    let occurrence = occurrences.get(key);
    if (occurrence === undefined) {
      occurrence = mostRecentScheduledOccurrence(schedule);
      occurrences.set(key, occurrence);
    }
    return occurrence && isDueForOccurrence(schedule, occurrence) ? occurrence : null;
  };
}
