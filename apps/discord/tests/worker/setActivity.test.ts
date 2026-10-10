import { describe, it, expect, afterEach } from "bun:test";
import { ActivityType } from "discord.js";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockEnv, mockClient } from "../helpers.js";

// setActivityCore lives in its own module so it cannot be clobbered by test
// files that mock `setActivity.js` to verify worker job dispatch. Its db/env/
// logger imports are type-only, so no process-global mock.module is needed.
import { BROADCAST_TIMEOUT_MS, setActivityCore } from "../../src/worker/jobs/setActivityCore.js";

/**
 * A client.shard whose broadcastEval mirrors discord.js: the function is
 * serialized and re-evaluated in the target shard, so a captured closure
 * variable would be undefined there and break this test too.
 */
function shardedClient(shardClient: { user: { setActivity: sinon.SinonStub } }) {
  const broadcastEval = sinon.stub().callsFake(async (fn: unknown, options: { context: unknown }) => {
    const context = JSON.parse(JSON.stringify(options.context));
    const revived = new Function(`return (${String(fn)})`)() as (c: unknown, ctx: unknown) => unknown;
    return [revived(shardClient, context)];
  });
  return { client: mockClient({ shard: { broadcastEval } }), broadcastEval };
}

describe("setActivity", () => {
  let clock: sinon.SinonFakeTimers | undefined;

  afterEach(() => {
    clock?.restore();
    clock = undefined;
  });

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
    const env = mockEnv({ DISCORD_DEFAULT_STATUS: "Default Status", DISCORD_DEFAULT_ACTIVITY_TYPE: "Custom" });
    db.select.returns(mockDbChain([
      { id: "a1", activity: "Custom activity", type: "Listening", url: null, createdAt: new Date() },
    ]));
    // [custom, default]: 0 picks the DB row, 0.99 picks the appended env default.
    const random = sinon.stub(Math, "random").returns(0);

    try {
      const client = mockClient();
      await setActivityCore(client as never, { db, env, logger } as never, { scope: "local" });
      expect(client.user.setActivity.calledOnce).toBe(true);
      expect(client.user.setActivity.firstCall.args).toEqual([
        "Custom activity", { type: ActivityType.Listening, url: undefined },
      ]);

      random.returns(0.99);
      const second = mockClient();
      await setActivityCore(second as never, { db, env, logger } as never, { scope: "local" });
      expect(second.user.setActivity.firstCall.args).toEqual([
        "Default Status", { type: ActivityType.Custom, url: undefined },
      ]);
    } finally {
      random.restore();
    }
  });

  it("should log and rethrow database fetch errors so the job fails", async () => {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.select.returns(chain);

    const client = mockClient();
    await expect(
      setActivityCore(client as never, { db, env, logger } as never)
    ).rejects.toThrow("DB error");

    expect(logger.error.calledOnce).toBe(true);
  });

  it("should use default activity type from env", async () => {
    const logger = mockLogger();
    const db = mockDb();
    // Listening differs from the Playing fallback, so ignoring env would fail here.
    const env = mockEnv({ DISCORD_DEFAULT_ACTIVITY_TYPE: "Listening", DISCORD_DEFAULT_STATUS: "Test Status" });
    db.select.returns(mockDbChain([]));

    const client = mockClient();
    await setActivityCore(client as never, { db, env, logger } as never);

    const setActivityCall = client.user.setActivity.firstCall;
    expect(setActivityCall.args[0]).toBe("Test Status");
    expect(setActivityCall.args[1].type).toBe(ActivityType.Listening);
  });

  it("broadcasts the presence to every shard by default", async () => {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv({ DISCORD_DEFAULT_STATUS: "Shard Status", DISCORD_DEFAULT_ACTIVITY_TYPE: "Listening" });
    db.select.returns(mockDbChain([]));
    const shardClient = { user: { setActivity: sinon.stub() } };
    const { client, broadcastEval } = shardedClient(shardClient);

    await setActivityCore(client as never, { db, env, logger } as never);

    expect(broadcastEval.calledOnce).toBe(true);
    // A null url crosses the IPC boundary and maps back to undefined.
    expect(shardClient.user.setActivity.firstCall.args).toEqual([
      "Shard Status", { type: ActivityType.Listening, url: undefined },
    ]);
    expect((client.user as { setActivity: sinon.SinonStub }).setActivity.called).toBe(false);
  });

  it("passes a streaming url through the broadcast context", async () => {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv({ DISCORD_DEFAULT_ACTIVITY_TYPE: "Streaming", DEFAULT_ACTIVITY_URL: "https://twitch.tv/x" });
    db.select.returns(mockDbChain([]));
    const shardClient = { user: { setActivity: sinon.stub() } };
    const { client } = shardedClient(shardClient);

    await setActivityCore(client as never, { db, env, logger } as never);

    expect(shardClient.user.setActivity.firstCall.args[1]).toEqual({
      type: ActivityType.Streaming, url: "https://twitch.tv/x",
    });
  });

  it("only touches this shard's gateway with scope local (used at shard ready)", async () => {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();
    db.select.returns(mockDbChain([]));
    const { client, broadcastEval } = shardedClient({ user: { setActivity: sinon.stub() } });

    await setActivityCore(client as never, { db, env, logger } as never, { scope: "local" });

    expect(broadcastEval.called).toBe(false);
    expect((client.user as { setActivity: sinon.SinonStub }).setActivity.calledOnce).toBe(true);
  });

  it("fails the job when the broadcast never settles (dead sibling shard)", async () => {
    clock = sinon.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();
    db.select.returns(mockDbChain([]));
    let markCalled: () => void = () => {};
    const called = new Promise<void>((resolve) => {
      markCalled = resolve;
    });
    const broadcastEval = sinon.stub().callsFake(() => {
      markCalled();
      return new Promise(() => {});
    });
    const client = mockClient({ shard: { broadcastEval } });

    const pending = setActivityCore(client as never, { db, env, logger } as never);
    const outcome = pending.then(() => "resolved", (err: Error) => err.message);
    // The timeout timer is armed in the same tick broadcastEval is invoked.
    await called;
    await clock.tickAsync(BROADCAST_TIMEOUT_MS);
    expect(await outcome).toContain("timed out");
    expect(logger.error.calledOnce).toBe(true);
  });

  it("clears the broadcast timer once the broadcast succeeds", async () => {
    clock = sinon.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();
    db.select.returns(mockDbChain([]));
    const { client } = shardedClient({ user: { setActivity: sinon.stub() } });

    await setActivityCore(client as never, { db, env, logger } as never);

    expect(clock.countTimers()).toBe(0);
  });
});
