/**
 * Shared free schedule for database defaults, command defaults and expiry fallback.
 *
 * Changing this moves delivery for every free guild. Bot copy derives from
 * describeDefaultSchedule(), but the website (apps/docs page.tsx and the
 * content/ MDX pages) repeats "8:00 AM America/Chicago" and needs a sweep too.
 */
export const DEFAULT_GUILD_SCHEDULE = {
  motivationFrequency: "Daily",
  motivationTime: "08:00",
  motivationDay: null,
  timezone: "America/Chicago",
} as const;

/** Render an "HH:mm" 24-hour time as "h:mm AM/PM" (e.g. "08:00" -> "8:00 AM"). */
function formatTime12h(value: string): string {
  const [hourText = "0", minute = "00"] = value.split(":");
  const hour = Number(hourText);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 === 0 ? 12 : hour % 12}:${minute} ${suffix}`;
}

/**
 * Human-readable free schedule for user-facing copy, derived from
 * DEFAULT_GUILD_SCHEDULE so the text cannot drift from actual delivery.
 * Example: "daily at 8:00 AM (America/Chicago)".
 */
export function describeDefaultSchedule(): string {
  const { motivationFrequency, motivationTime, timezone } = DEFAULT_GUILD_SCHEDULE;
  return `${motivationFrequency.toLowerCase()} at ${formatTime12h(motivationTime)} (${timezone})`;
}
