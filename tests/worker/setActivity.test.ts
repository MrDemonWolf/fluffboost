import { describe, it, expect, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockEnv, mockClient } from "../helpers.js";

// Mock schema to prevent real DB connection during import
mock.module("../../src/database/index.js", () => ({ db: {}, queryClient: () => Promise.resolve([]) }));
mock.module("../../src/utils/env.js", () => ({ default: {} }));
mock.module("../../src/utils/logger.js", () => ({ default: {} }));

// Import the core function that accepts deps directly — no mock.module needed for testing
const { setActivityCore } = await import("../../src/worker/jobs/setActivity.js");

describe("setActivity", () => {
  it("should warn and return when client.user is undefined", async () => {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();

    const client = mockClient({ user: undefined });
    await setActivityCore(client as never, { db, env, logger } as never);

    expect(logger.warn.calledOnce).toBe(true);
  });

  it("should use default activity when no custom activities in DB", async () => {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();
    db.select.returns(mockDbChain([]));

    const client = mockClient();
    await setActivityCore(client as never, { db, env, logger } as never);

    expect((client.user as { setActivity: sinon.SinonStub }).setActivity.calledOnce).toBe(true);
    expect(logger.warn.calledOnce).toBe(true);
    expect(logger.success.calledOnce).toBe(true);
  });

  it("should select from custom + default activities when available", async () => {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();
    db.select.returns(mockDbChain([
      { id: "a1", activity: "Custom activity", type: "Playing", url: null, createdAt: new Date() },
    ]));

    const client = mockClient();

    for (let i = 0; i < 5; i++) {
      (client.user as { setActivity: sinon.SinonStub }).setActivity.reset();
      await setActivityCore(client as never, { db, env, logger } as never);
      expect((client.user as { setActivity: sinon.SinonStub }).setActivity.calledOnce).toBe(true);
    }
  });

  it("should handle database fetch errors gracefully", async () => {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.select.returns(chain);

    const client = mockClient();
    await setActivityCore(client as never, { db, env, logger } as never);

    expect(logger.error.calledOnce).toBe(true);
  });

  it("should use default activity type from env", async () => {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv({ DISCORD_DEFAULT_ACTIVITY_TYPE: "Playing", DISCORD_DEFAULT_STATUS: "Test Status" });
    db.select.returns(mockDbChain([]));

    const client = mockClient();
    await setActivityCore(client as never, { db, env, logger } as never);

    const setActivityCall = (client.user as { setActivity: sinon.SinonStub }).setActivity.firstCall;
    expect(setActivityCall.args[0]).toBe("Test Status");
  });
});
