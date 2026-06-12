import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockEntitlement } from "../helpers.js";

describe("entitlementUpdateEvent", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should set isPremium=false when endsAt is in the past (expired)", async () => {
    const db = mockDb();
    const chain = mockDbChain([]);
    db.update.returns(chain);

    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    const { entitlementUpdateEvent } = await import("../../src/events/entitlementUpdate.js");

    const expired = mockEntitlement({ guildId: "g1", endsAt: new Date(Date.now() - 60_000) });
    await entitlementUpdateEvent(null, expired as never);

    expect(db.update.calledOnce).toBe(true);
    expect((chain.set as sinon.SinonStub).firstCall.args[0]).toEqual({ isPremium: false });
  });

  it("should set isPremium=true when endsAt is null", async () => {
    const db = mockDb();
    const chain = mockDbChain([]);
    db.update.returns(chain);

    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    const { entitlementUpdateEvent } = await import("../../src/events/entitlementUpdate.js");

    const renewed = mockEntitlement({ guildId: "g1", endsAt: null });
    await entitlementUpdateEvent(null, renewed as never);

    expect(db.update.calledOnce).toBe(true);
    expect((chain.set as sinon.SinonStub).firstCall.args[0]).toEqual({ isPremium: true });
  });

  it("should keep isPremium=true when endsAt is in the future (renewal carries the next period end)", async () => {
    const db = mockDb();
    const chain = mockDbChain([]);
    db.update.returns(chain);

    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    const { entitlementUpdateEvent } = await import("../../src/events/entitlementUpdate.js");

    const renewed = mockEntitlement({ guildId: "g1", endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
    await entitlementUpdateEvent(null, renewed as never);

    expect(db.update.calledOnce).toBe(true);
    expect((chain.set as sinon.SinonStub).firstCall.args[0]).toEqual({ isPremium: true });
  });

  it("should not update DB for user-level entitlement (no guildId)", async () => {
    const db = mockDb();

    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    const { entitlementUpdateEvent } = await import("../../src/events/entitlementUpdate.js");

    await entitlementUpdateEvent(null, mockEntitlement({ guildId: null }) as never);
    expect(db.update.called).toBe(false);
  });

  it("should handle DB update failure gracefully", async () => {
    const db = mockDb();
    const logger = mockLogger();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.update.returns(chain);

    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const { entitlementUpdateEvent } = await import("../../src/events/entitlementUpdate.js");

    await entitlementUpdateEvent(null, mockEntitlement({ guildId: "g1" }) as never);
    expect(logger.error.calledOnce).toBe(true);
  });
});
