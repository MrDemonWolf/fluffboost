/**
 * Validates whether a string is a valid IANA timezone identifier.
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Current IANA names that runtimes still list under their legacy CLDR alias
 * (Asia/Calcutta, Europe/Kiev, ...), so they would never autocomplete even
 * though Intl accepts them. Kept only when this runtime accepts them.
 */
const MODERN_TIMEZONE_ALIASES = [
  "Asia/Kolkata",
  "Europe/Kyiv",
  "Asia/Ho_Chi_Minh",
  "Asia/Kathmandu",
  "Asia/Yangon",
  "America/Nuuk",
  "America/Argentina/Buenos_Aires",
];

/**
 * All IANA timezones available in the current runtime, plus modern aliases.
 */
export const ALL_TIMEZONES: string[] = [
  ...new Set([...Intl.supportedValuesOf("timeZone"), ...MODERN_TIMEZONE_ALIASES.filter(isValidTimezone)]),
].sort();

/** Shown before the user types anything, instead of the first 25 alphabetically (Africa/...). */
const COMMON_TIMEZONES = [
  "America/Chicago",
  "America/New_York",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "America/Toronto",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Lagos",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
  "UTC",
].filter(isValidTimezone);

/** Lowercase and treat spaces, underscores and hyphens alike ("new york" ~ "New_York"). */
function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

/**
 * Filters the timezone list based on user input for Discord autocomplete.
 * City-name prefix matches rank first. Returns top 25 matches (Discord
 * autocomplete limit); an empty query returns a curated list of common zones.
 */
export function filterTimezones(query: string): string[] {
  const q = normalize(query);
  if (!q) {
    return COMMON_TIMEZONES.slice(0, 25);
  }

  const cityPrefix: string[] = [];
  const other: string[] = [];
  for (const tz of ALL_TIMEZONES) {
    const normalized = normalize(tz);
    if (!normalized.includes(q)) {
      continue;
    }
    const city = normalized.slice(normalized.lastIndexOf("/") + 1);
    (city.startsWith(q) ? cityPrefix : other).push(tz);
  }
  return [...cityPrefix, ...other].slice(0, 25);
}
