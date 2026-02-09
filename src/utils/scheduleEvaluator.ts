import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

import type { Guild, MotivationFrequency } from "../generated/prisma/client.js";

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
 * Get the current time components in a specific timezone using dayjs.
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
 * Determines if a guild is due to receive a motivation quote right now.
 *
 * Checks the current time in the guild's timezone against their configured
 * schedule (frequency, time, and day). Also verifies the guild hasn't already
 * received a quote for this period via lastMotivationSentAt.
 */
export function isGuildDueForMotivation(guild: Pick<Guild, keyof GuildSchedule>): boolean {
  const { motivationFrequency, motivationTime, motivationDay, timezone: tz, lastMotivationSentAt } = guild;

  const [targetHourStr, targetMinuteStr] = motivationTime.split(":");
  const targetHour = parseInt(targetHourStr ?? "8", 10);
  const targetMinute = parseInt(targetMinuteStr ?? "0", 10);

  const current = getCurrentTimeInTimezone(tz);

  // Check if current time matches the target time (exact minute match)
  if (current.hour !== targetHour || current.minute !== targetMinute) {
    return false;
  }

  // Check frequency-specific day constraints
  switch (motivationFrequency) {
    case "Daily":
      // No day constraint for daily
      break;
    case "Weekly":
      if (motivationDay === null || current.dayOfWeek !== motivationDay) {
        return false;
      }
      break;
    case "Monthly":
      if (motivationDay === null || current.dayOfMonth !== motivationDay) {
        return false;
      }
      break;
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
        // Already sent this week (same ISO week)
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
