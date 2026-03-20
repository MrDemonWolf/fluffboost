import { describe, it, expect, afterEach, beforeEach, mock } from "bun:test";
import sinon from "sinon";
import { mockEnv, mockLogger, mockInteraction } from "../helpers.js";

describe("permissions", () => {

  afterEach(() => {
    sinon.restore();
  });

  it("should return true when user is in ALLOWED_USERS", async () => {
    const logger = mockLogger();
    mock.module("../../src/utils/env.js", () => ({
      default: mockEnv({ ALLOWED_USERS: "user-123, user-456" }),
    }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const { isUserPermitted } = await import("../../src/utils/permissions.js");

    const interaction = mockInteraction({ user: { id: "user-123", username: "allowed" } });
    const result = await isUserPermitted(interaction as never);
    expect(result).toBe(true);
  });

  it("should return false and reply when user is not in ALLOWED_USERS", async () => {
    const logger = mockLogger();
    mock.module("../../src/utils/env.js", () => ({
      default: mockEnv({ ALLOWED_USERS: "user-123, user-456" }),
    }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const { isUserPermitted } = await import("../../src/utils/permissions.js");

    const interaction = mockInteraction({ user: { id: "user-999", username: "denied" } });
    const result = await isUserPermitted(interaction as never);
    expect(result).toBe(false);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
  });

  it("should handle whitespace in the comma-separated ALLOWED_USERS list", async () => {
    const logger = mockLogger();
    mock.module("../../src/utils/env.js", () => ({
      default: mockEnv({ ALLOWED_USERS: "  user-abc  ,  user-def  " }),
    }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const { isUserPermitted } = await import("../../src/utils/permissions.js");

    const interaction = mockInteraction({ user: { id: "user-abc", username: "spaced" } });
    const result = await isUserPermitted(interaction as never);
    expect(result).toBe(true);
  });

  it("should return false without crashing when ALLOWED_USERS is undefined", async () => {
    const logger = mockLogger();
    mock.module("../../src/utils/env.js", () => ({
      default: mockEnv({ ALLOWED_USERS: undefined }),
    }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const { isUserPermitted } = await import("../../src/utils/permissions.js");

    const interaction = mockInteraction({ user: { id: "user-123", username: "test" } });
    const result = await isUserPermitted(interaction as never);
    expect(result).toBe(false);
  });

  it("should return false without crashing when ALLOWED_USERS is empty string", async () => {
    const logger = mockLogger();
    mock.module("../../src/utils/env.js", () => ({
      default: mockEnv({ ALLOWED_USERS: "" }),
    }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const { isUserPermitted } = await import("../../src/utils/permissions.js");

    const interaction = mockInteraction({ user: { id: "user-123", username: "test" } });
    const result = await isUserPermitted(interaction as never);
    expect(result).toBe(false);
  });

  it("should log unauthorized access attempts", async () => {
    const logger = mockLogger();
    mock.module("../../src/utils/env.js", () => ({
      default: mockEnv({ ALLOWED_USERS: "user-123" }),
    }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const { isUserPermitted } = await import("../../src/utils/permissions.js");

    const interaction = mockInteraction({ user: { id: "user-bad", username: "hacker" } });
    await isUserPermitted(interaction as never);
    expect(logger.unauthorized.calledOnce).toBe(true);
  });
});
