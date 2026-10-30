import { mock } from "bun:test";
import sinon from "sinon";

type PermissionsModule = typeof import("../../src/utils/permissions.js");

/** The exact reply the real `isUserPermitted` sends when a user is not in ALLOWED_USERS. */
export const ADMIN_DENIED_REPLY = "You are not allowed to use this command";

/** A snowflake that is not in the default `mockEnv()` / preload ALLOWED_USERS list. */
export const NOT_ALLOWED_USER_ID = "100000000000000777";

let real: PermissionsModule | undefined;

/**
 * The real exports, copied on first use (before this file registers any mock),
 * so later calls in the same test file still get the real functions.
 */
async function realPermissions(): Promise<PermissionsModule> {
  real ??= { ...(await import("../../src/utils/permissions.js")) };
  return real;
}

/**
 * Replace only `isUserPermitted` in utils/permissions.js and keep every other
 * export real, so a command under test can still import `requireGuildId` /
 * `requireGuildAdministrator`. The real exports are copied before the mock is
 * registered. (A `?actual` query-suffix copy would also work, but Bun then
 * reports the real file as uncovered.)
 *
 * Unlike the real guard, the stub never replies to the interaction, so a denied
 * run leaves `interaction.reply` uncalled. Returns the stub for call assertions.
 */
export async function mockPermissions(permitted: boolean): Promise<sinon.SinonStub> {
  const actual = await realPermissions();
  const isUserPermitted = sinon.stub().resolves(permitted);
  mock.module("../../src/utils/permissions.js", () => ({ ...actual, isUserPermitted }));
  return isUserPermitted;
}

/**
 * Register the real permissions module, undoing any earlier `mockPermissions`
 * in this file, so the real ALLOWED_USERS gate runs and sends its own denial
 * reply. Denied-path tests use this so they fail if a handler drops its gate:
 * a stubbed `false` that never replies cannot tell "denied" from "did nothing".
 */
export async function useRealPermissions(): Promise<void> {
  const actual = await realPermissions();
  mock.module("../../src/utils/permissions.js", () => ({ ...actual }));
}
