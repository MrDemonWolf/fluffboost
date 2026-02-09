/**
 * All IANA timezones available in the current Node.js runtime.
 */
export const ALL_TIMEZONES: string[] = Intl.supportedValuesOf("timeZone");

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
 * Filters the timezone list based on user input for Discord autocomplete.
 * Returns top 25 matches (Discord autocomplete limit).
 */
export function filterTimezones(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const matches = ALL_TIMEZONES.filter((tz) => tz.toLowerCase().includes(lowerQuery));
  return matches.slice(0, 25);
}
