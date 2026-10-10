import { describe, it, expect, beforeEach, mock } from "bun:test";
import sinon from "sinon";
import { MessageFlags } from "discord.js";
import { mockEnv, mockLogger, mockInteraction } from "../helpers.js";

const logger = mockLogger();
const env = mockEnv();

mock.module("../../src/utils/env.js", () => ({ default: env }));
mock.module("../../src/utils/logger.js", () => ({ default: logger }));

// The suite runs with --isolate, so no other file's permissions.js stub can
// stand in for the real guards (a query-suffix copy would also hide coverage).
const { isUserPermitted, requireGuildAdministrator } = await import("../../src/utils/permissions.js");

describe("permissions", () => {
  beforeEach(() => {
    sinon.restore();
    Object.assign(env, mockEnv());
    for (const value of Object.values(logger)) {
      if (typeof value === "function" && "reset" in value) {
        (value as sinon.SinonStub).reset();
      }
    }
  });

  it("should return true when user is in ALLOWED_USERS", async () => {
    Object.assign(env, { ALLOWED_USERS: "user-123, user-456" });
    const interaction = mockInteraction({ user: { id: "user-123", username: "allowed" } });
    const result = await isUserPermitted(interaction as never);
    expect(result).toBe(true);
  });

  it("should return false and reply when user is not in ALLOWED_USERS", async () => {
    Object.assign(env, { ALLOWED_USERS: "user-123, user-456" });
    const interaction = mockInteraction({ user: { id: "user-999", username: "denied" } });
    const result = await isUserPermitted(interaction as never);
    expect(result).toBe(false);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
  });

  it("should handle whitespace in the comma-separated ALLOWED_USERS list", async () => {
    Object.assign(env, { ALLOWED_USERS: "  user-abc  ,  user-def  " });
    const interaction = mockInteraction({ user: { id: "user-abc", username: "spaced" } });
    const result = await isUserPermitted(interaction as never);
    expect(result).toBe(true);
  });

  it("should return false without crashing when ALLOWED_USERS is undefined", async () => {
    Object.assign(env, { ALLOWED_USERS: undefined });
    const interaction = mockInteraction({ user: { id: "user-123", username: "test" } });
    const result = await isUserPermitted(interaction as never);
    expect(result).toBe(false);
  });

  it("should return false without crashing when ALLOWED_USERS is empty string", async () => {
    Object.assign(env, { ALLOWED_USERS: "" });
    const interaction = mockInteraction({ user: { id: "user-123", username: "test" } });
    const result = await isUserPermitted(interaction as never);
    expect(result).toBe(false);
  });

  it("should log unauthorized access attempts", async () => {
    Object.assign(env, { ALLOWED_USERS: "user-123" });
    const interaction = mockInteraction({ user: { id: "user-bad", username: "hacker" } });
    await isUserPermitted(interaction as never);
    expect(logger.unauthorized.calledOnce).toBe(true);
  });

  it("requireGuildAdministrator allows members with Administrator", async () => {
    const has = sinon.stub().returns(true);
    const interaction = mockInteraction({ memberPermissions: { has } });
    expect(await requireGuildAdministrator(interaction as never)).toBe(true);
    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
  });

  it("requireGuildAdministrator refuses other members with an ephemeral reply", async () => {
    const interaction = mockInteraction({ memberPermissions: { has: sinon.stub().returns(false) } });
    expect(await requireGuildAdministrator(interaction as never)).toBe(false);
    const reply = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(reply.content).toContain("Administrator");
    expect(reply.flags).toBe(MessageFlags.Ephemeral);
  });

  it("requireGuildAdministrator refuses interactions with no member permissions (DMs)", async () => {
    const interaction = mockInteraction({ memberPermissions: null });
    expect(await requireGuildAdministrator(interaction as never)).toBe(false);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
  });
});
