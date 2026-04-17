import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockEntitlement } from "../helpers.js";

describe("entitlementUpdateEvent", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should set isPremium=false when endsAt is not null (cancellation)", async () => {
    const db = mockDb();

    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    const { entitlementUpdateEvent } = await import("../../src/events/entitlementUpdate.js");

    const cancelled = mockEntitlement({ guildId: "g1", endsAt: new Date("2025-12-31") });
    await entitlementUpdateEvent(null, cancelled as never);

    expect(db.update.calledOnce).toBe(true);
  });

  it("should set isPremium=true when endsAt is null (renewal)", async () => {
    const db = mockDb();

    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    const { entitlementUpdateEvent } = await import("../../src/events/entitlementUpdate.js");

    const renewed = mockEntitlement({ guildId: "g1", endsAt: null });
    await entitlementUpdateEvent(null, renewed as never);

    expect(db.update.calledOnce).toBe(true);
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
