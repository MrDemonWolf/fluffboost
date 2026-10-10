import { mock } from "bun:test";
import sinon from "sinon";

/**
 * Replace only `isUserPermitted` in utils/permissions.js and keep every other
 * export real, so a command under test can still import `requireGuildId` /
 * `requireGuildAdministrator`. The real exports are copied before the mock is
 * registered. (A `?actual` query-suffix copy would also work, but Bun then
 * reports the real file as uncovered.)
 */
export async function mockPermissions(permitted: boolean): Promise<sinon.SinonStub> {
  const actual = { ...(await import("../../src/utils/permissions.js")) };
  const isUserPermitted = sinon.stub().resolves(permitted);
  mock.module("../../src/utils/permissions.js", () => ({ ...actual, isUserPermitted }));
  return isUserPermitted;
}
