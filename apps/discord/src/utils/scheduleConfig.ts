/** Shared free schedule for database defaults, command defaults and expiry fallback. */
export const DEFAULT_GUILD_SCHEDULE = {
  motivationFrequency: "Daily",
  motivationTime: "08:00",
  motivationDay: null,
  timezone: "America/Chicago",
} as const;
