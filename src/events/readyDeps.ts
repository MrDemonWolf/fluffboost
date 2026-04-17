/**
 * Thin re-export shim for ready.ts's dependencies. Tests for the ready event
 * mock THIS module instead of the underlying shared utilities, so that
 * process-global `mock.module` calls from ready.test.ts don't clobber the real
 * implementations used by each utility's own test file.
 */
export { pruneGuilds, ensureGuildExists } from "../utils/guildDatabase.js";
export { default as setActivity } from "../worker/jobs/setActivity.js";
