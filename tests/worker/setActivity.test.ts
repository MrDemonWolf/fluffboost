import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockEnv, mockClient } from "../helpers.js";

describe("setActivity", () => {
  afterEach(() => {
    sinon.restore();
    mock.restore();
  });

  async function loadModule(overrides: {
    db?: ReturnType<typeof mockDb>;
    logger?: ReturnType<typeof mockLogger>;
    env?: Record<string, unknown>;
  } = {}) {
    const db = overrides.db ?? mockDb();
    const logger = overrides.logger ?? mockLogger();
    const env = mockEnv(overrides.env ?? {});

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/env.js", () => ({ default: env }));

    const mod = await import("../../src/worker/jobs/setActivity.js");

    return { setActivity: mod.default, db, logger };
  }

  it("should warn and return when client.user is undefined", async () => {
    const logger = mockLogger();
    const { setActivity } = await loadModule({ logger });

    const client = mockClient({ user: undefined });
    await setActivity(client as never);

    expect(logger.warn.calledOnce).toBe(true);
  });

  it("should use default activity when no custom activities in DB", async () => {
    const db = mockDb();
    db.select.returns(mockDbChain([]));

    const { setActivity, logger } = await loadModule({ db });
    const client = mockClient();
    await setActivity(client as never);

    expect((client.user as { setActivity: sinon.SinonStub }).setActivity.calledOnce).toBe(true);
    expect(logger.warn.calledOnce).toBe(true);
    expect(logger.success.calledOnce).toBe(true);
  });

  it("should select from custom + default activities when available", async () => {
    const db = mockDb();
    db.select.returns(mockDbChain([
      { id: "a1", activity: "Custom activity", type: "Playing", url: null, createdAt: new Date() },
    ]));

    const { setActivity } = await loadModule({ db });
    const client = mockClient();

    // Run multiple times to cover randomness
    for (let i = 0; i < 5; i++) {
      (client.user as { setActivity: sinon.SinonStub }).setActivity.reset();
      await setActivity(client as never);
      expect((client.user as { setActivity: sinon.SinonStub }).setActivity.calledOnce).toBe(true);
    }
  });

  it("should handle database fetch errors gracefully", async () => {
    const db = mockDb();
    const logger = mockLogger();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.select.returns(chain);

    const { setActivity } = await loadModule({ db, logger });
    const client = mockClient();

    await setActivity(client as never);
    expect(logger.error.calledOnce).toBe(true);
  });

  it("should use default activity type from env", async () => {
    const db = mockDb();
    db.select.returns(mockDbChain([]));

    const { setActivity } = await loadModule({
      db,
      env: { DISCORD_DEFAULT_ACTIVITY_TYPE: "Playing", DISCORD_DEFAULT_STATUS: "Test Status" },
    });

    const client = mockClient();
    await setActivity(client as never);

    const setActivityCall = (client.user as { setActivity: sinon.SinonStub }).setActivity.firstCall;
    expect(setActivityCall.args[0]).toBe("Test Status");
  });
});
