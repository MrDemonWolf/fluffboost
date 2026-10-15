/**
 * Thin re-export shim for ready.ts's dependencies. ready.test.ts mocks THIS
 * module (one `mock.module` call) instead of each underlying utility module,
 * so it never has to replace those shared modules wholesale.
 */
export { pruneGuilds, ensureGuildExists } from "../utils/guildDatabase.js";
export { default as setActivity } from "../worker/jobs/setActivity.js";
export { reconcilePremium } from "../utils/premiumReconciliation.js";
