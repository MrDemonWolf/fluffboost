import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import sinon from "sinon";
import type { SinonStub } from "sinon";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { mockDb, mockDbChain, mockEnv, mockLogger } from "../helpers.js";

const db = mockDb();
const logger = mockLogger();
const SKU = "sku-123";
const dialect = new PgDialect();

mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
mock.module("../../src/utils/logger.js", () => ({ default: logger }));

const { reconcilePremium, startPremiumReconciliationLoop } = await import("../../src/utils/premiumReconciliation.js");

let tx: ReturnType<typeof mockDb>;
const params = (stub: SinonStub, call = 0) =>
  dialect.sqlToQuery(stub.getCall(call).args[0] as SQL).params;

function grant(guildId: string, id: string) {
  return { id, guildId, skuId: SKU, deleted: false, startsAt: new Date(0), endsAt: null, isTest: () => false };
}

function makeClient(guildIds: string[], pages: Map<string, unknown>[] = []) {
  const fetch = sinon.stub();
  pages.forEach((page, i) => fetch.onCall(i).resolves(page));
  fetch.resolves(new Map());
  return {
    client: {
      guilds: { cache: new Map(guildIds.map((id) => [id, {}])) },
      application: { entitlements: { fetch } },
      shard: { ids: [0] },
    },
    fetch,
  };
}

function premiumBefore(guildIds: string[]) {
  db.select.returns(mockDbChain(guildIds.map((guildId) => ({ guildId }))));
}

describe("reconcilePremium", () => {
  beforeEach(() => {
    mock.module("../../src/utils/env.js", () => ({
      default: mockEnv({ PREMIUM_ENABLED: true, DISCORD_PREMIUM_SKU_ID: SKU }),
    }));
    db.select.reset();
    db.select.callsFake(() => mockDbChain([]));
    db.transaction.reset();
    db.transaction.callsFake(async (fn: (t: ReturnType<typeof mockDb>) => Promise<unknown>) => {
      tx = mockDb();
      tx.update.callsFake(() => mockDbChain([]));
      return fn(tx);
    });
    logger.error.resetHistory();
  });

  it("reconciles every cached guild on this shard against one full snapshot", async () => {
    premiumBefore(["g1", "g3"]);
    const { client, fetch } = makeClient(["g1", "g2", "g3"], [new Map([["10", grant("g2", "10")]])]);

    await reconcilePremium(client as never);

    expect(fetch.firstCall.args[0]).toMatchObject({ after: "0", skus: [SKU] });
    expect(fetch.firstCall.args[0].guild).toBeUndefined();
    expect(db.transaction.calledOnce).toBe(true);
    expect(tx.update.callCount).toBe(2);
    const revoke = tx.update.getCall(0).returnValue as Record<string, SinonStub>;
    const grantChain = tx.update.getCall(1).returnValue as Record<string, SinonStub>;
    expect(revoke["set"]!.firstCall.args[0]).toEqual({ isPremium: false });
    expect(params(revoke["where"]!)).toEqual(["g1", "g3"]);
    expect(grantChain["set"]!.firstCall.args[0]).toEqual({ isPremium: true });
    expect(params(grantChain["where"]!)).toEqual(["g2"]);
  });

  it("does not revoke a guild that was granted while the snapshot was being fetched", async () => {
    // Not premium before the fetch: a concurrent ENTITLEMENT_CREATE may write true meanwhile.
    premiumBefore([]);
    const { client } = makeClient(["g1"]);

    await reconcilePremium(client as never);

    expect(db.transaction.called).toBe(false);
  });

  it("reads the prior premium rows before fetching the snapshot", async () => {
    premiumBefore([]);
    const { client, fetch } = makeClient(["g1"]);
    await reconcilePremium(client as never);
    expect(db.select.calledBefore(fetch)).toBe(true);
  });

  it("scopes a single-guild reconcile to that guild", async () => {
    premiumBefore(["g9"]);
    const { client, fetch } = makeClient(["g1"]);

    await reconcilePremium(client as never, "g9");

    expect(fetch.firstCall.args[0]).toMatchObject({ guild: "g9", after: "0" });
    const revoke = tx.update.getCall(0).returnValue as Record<string, SinonStub>;
    expect(params(revoke["where"]!)).toEqual(["g9"]);
  });

  it("skips Discord when the shard has no guilds", async () => {
    const { client, fetch } = makeClient([]);
    await reconcilePremium(client as never);
    expect(fetch.called).toBe(false);
    expect(db.transaction.called).toBe(false);
  });

  it("rejects when the application is unavailable", async () => {
    const { client } = makeClient(["g1"]);
    await expect(reconcilePremium({ ...client, application: null } as never)).rejects.toThrow(
      "Application is unavailable"
    );
  });

  it("keeps existing flags when the entitlement fetch fails", async () => {
    premiumBefore(["g1"]);
    const { client, fetch } = makeClient(["g1"]);
    fetch.rejects(new Error("Discord 503"));
    await expect(reconcilePremium(client as never)).rejects.toThrow("Discord 503");
    expect(db.transaction.called).toBe(false);
  });

  it("is a no-op while Premium is disabled", async () => {
    mock.module("../../src/utils/env.js", () => ({
      default: mockEnv({ PREMIUM_ENABLED: false, DISCORD_PREMIUM_SKU_ID: SKU }),
    }));
    const { client, fetch } = makeClient(["g1"]);
    await reconcilePremium(client as never);
    expect(fetch.called).toBe(false);
    expect(db.select.called).toBe(false);
  });
});

describe("startPremiumReconciliationLoop", () => {
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    mock.module("../../src/utils/env.js", () => ({
      default: mockEnv({ PREMIUM_ENABLED: true, DISCORD_PREMIUM_SKU_ID: SKU }),
    }));
    db.select.reset();
    db.select.callsFake(() => mockDbChain([]));
    db.transaction.reset();
    db.transaction.callsFake(async (fn: (t: ReturnType<typeof mockDb>) => Promise<unknown>) => fn(mockDb()));
    logger.error.resetHistory();
    clock = sinon.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  });
  afterEach(() => {
    clock.restore();
  });

  it("re-reconciles on each interval until stopped", async () => {
    const { client, fetch } = makeClient(["g1"]);
    const stop = startPremiumReconciliationLoop(client as never, 1000);

    expect(fetch.called).toBe(false);
    await clock.tickAsync(1000);
    expect(fetch.callCount).toBe(1);
    await clock.tickAsync(1000);
    expect(fetch.callCount).toBe(2);

    stop();
    await clock.tickAsync(5000);
    expect(fetch.callCount).toBe(2);
  });

  it("defaults to a 30 minute interval", async () => {
    const { client, fetch } = makeClient(["g1"]);
    const stop = startPremiumReconciliationLoop(client as never);
    await clock.tickAsync(30 * 60_000 - 1);
    expect(fetch.called).toBe(false);
    await clock.tickAsync(1);
    expect(fetch.calledOnce).toBe(true);
    stop();
  });

  it("logs failures without clearing flags or stopping the loop", async () => {
    premiumBefore(["g1"]);
    const { client, fetch } = makeClient(["g1"]);
    fetch.rejects(new Error("Discord 503"));
    const stop = startPremiumReconciliationLoop(client as never, 1000);

    await clock.tickAsync(1000);
    expect(logger.error.calledOnce).toBe(true);
    expect(db.transaction.called).toBe(false);

    fetch.resolves(new Map());
    await clock.tickAsync(1000);
    expect(fetch.callCount).toBe(2);
    expect(db.transaction.calledOnce).toBe(true);
    stop();
  });

  it("skips a tick while the previous reconcile is still running", async () => {
    const { client, fetch } = makeClient(["g1"]);
    let release: (value: Map<string, unknown>) => void = () => {};
    fetch.onCall(0).returns(new Promise((resolve) => { release = resolve; }));
    const stop = startPremiumReconciliationLoop(client as never, 1000);

    await clock.tickAsync(3000);
    expect(fetch.callCount).toBe(1);
    release(new Map());
    await clock.tickAsync(1000);
    expect(fetch.callCount).toBe(2);
    stop();
  });

  it("does not keep the process alive", () => {
    const unref = sinon.stub();
    const timer = { unref };
    const setIntervalStub = sinon.stub(globalThis, "setInterval").returns(timer as never);
    const clearIntervalStub = sinon.stub(globalThis, "clearInterval");
    try {
      const stop = startPremiumReconciliationLoop(makeClient(["g1"]).client as never, 1000);
      expect(unref.calledOnce).toBe(true);
      stop();
      expect(clearIntervalStub.calledOnceWithExactly(timer as never)).toBe(true);
    } finally {
      setIntervalStub.restore();
      clearIntervalStub.restore();
    }
  });
});
