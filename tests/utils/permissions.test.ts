import { describe, it, expect, beforeEach, mock } from "bun:test";
import sinon from "sinon";
import { mockEnv, mockLogger, mockInteraction } from "../helpers.js";

const logger = mockLogger();
const env = mockEnv();

mock.module("../../src/utils/env.js", () => ({ default: env, envSchema: {} }));
mock.module("../../src/utils/logger.js", () => ({ default: logger }));

const { isUserPermitted } = await import("../../src/utils/permissions.js");

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
});
