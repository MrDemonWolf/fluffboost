/**
 * Thin re-export shim so command-level tests can mock these deps without
 * poisoning `tests/utils/quoteHelpers.test.ts` (bun:test's mock.module
 * registry is process-global). See #21 for the same pattern applied to
 * readyDeps.ts.
 */
export {
  buildMotivationEmbed,
  getRandomMotivationQuote,
  resolveQuoteAuthor,
} from "../utils/quoteHelpers.js";
