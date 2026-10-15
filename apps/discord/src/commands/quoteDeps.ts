/**
 * Thin re-export shim for `/quote`. `tests/commands/quote.test.ts` mocks this
 * module instead of `utils/quoteHelpers.js`, so the mock stays narrow and does
 * not replace the real helpers for anything else imported in that file.
 */
export {
  buildMotivationEmbed,
  getRandomMotivationQuote,
  resolveQuoteAuthor,
} from "../utils/quoteHelpers.js";
