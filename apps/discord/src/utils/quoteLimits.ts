// Discord review embeds use fields, which allow at most 1024 characters.
export const MAX_QUOTE_LENGTH = 1024;
export const MAX_QUOTE_AUTHOR_LENGTH = 256;

export function quoteInputError(quote: string, author: string): string | null {
  if (!quote.trim() || quote.length > MAX_QUOTE_LENGTH) {
    return `Use a quote between 1 and ${MAX_QUOTE_LENGTH} characters.`;
  }
  if (!author.trim() || author.length > MAX_QUOTE_AUTHOR_LENGTH) {
    return `Use an author between 1 and ${MAX_QUOTE_AUTHOR_LENGTH} characters.`;
  }
  return null;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Library record IDs (quotes, suggestions, activities) are Postgres UUIDs.
 * Checking the shape first turns a mistyped ID into a "not found" reply
 * instead of a Postgres invalid-input error.
 */
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
