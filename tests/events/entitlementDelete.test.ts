import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockEntitlement } from "../helpers.js";

describe("entitlementDeleteEvent", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should update guild isPremium=false for guild-level entitlement", async () => {
    const db = mockDb();

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    const { entitlementDeleteEvent } = await import("../../src/events/entitlementDelete.js");

    await entitlementDeleteEvent(mockEntitlement({ guildId: "g1" }) as never);

    expect(db.update.calledOnce).toBe(true);
  });

  it("should not update DB for user-level entitlement (no guildId)", async () => {
    const db = mockDb();

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    const { entitlementDeleteEvent } = await import("../../src/events/entitlementDelete.js");

    await entitlementDeleteEvent(mockEntitlement({ guildId: null }) as never);
    expect(db.update.called).toBe(false);
  });

  it("should handle DB update failure gracefully", async () => {
    const db = mockDb();
    const logger = mockLogger();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.update.returns(chain);

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const { entitlementDeleteEvent } = await import("../../src/events/entitlementDelete.js");

    await entitlementDeleteEvent(mockEntitlement({ guildId: "g1" }) as never);
    expect(logger.error.calledOnce).toBe(true);
  });
});
