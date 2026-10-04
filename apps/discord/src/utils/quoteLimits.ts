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
