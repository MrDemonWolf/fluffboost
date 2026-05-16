/**
 * Thin re-export shim so the worker job test can mock these deps without
 * poisoning `tests/utils/quoteHelpers.test.ts`.
 */
export {
  buildMotivationEmbed,
  getRandomMotivationQuote,
  resolveQuoteAuthor,
} from "../../utils/quoteHelpers.js";
