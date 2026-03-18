import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockPosthog, mockEntitlement } from "../helpers.js";

describe("entitlementDeleteEvent", () => {
  afterEach(() => {
    sinon.restore();
    mock.restore();
  });

  it("should update guild isPremium=false for guild-level entitlement", async () => {
    const db = mockDb();

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    mock.module("../../src/utils/posthog.js", () => ({ default: mockPosthog() }));
    const { entitlementDeleteEvent } = await import("../../src/events/entitlementDelete.js");

    await entitlementDeleteEvent(mockEntitlement({ guildId: "g1" }) as never);

    expect(db.update.calledOnce).toBe(true);
  });

  it("should not update DB for user-level entitlement (no guildId)", async () => {
    const db = mockDb();

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    mock.module("../../src/utils/posthog.js", () => ({ default: mockPosthog() }));
    const { entitlementDeleteEvent } = await import("../../src/events/entitlementDelete.js");

    await entitlementDeleteEvent(mockEntitlement({ guildId: null }) as never);
    expect(db.update.called).toBe(false);
  });

  it("should capture posthog event", async () => {
    const posthog = mockPosthog();

    mock.module("../../src/database/index.js", () => ({ db: mockDb() }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    mock.module("../../src/utils/posthog.js", () => ({ default: posthog }));
    const { entitlementDeleteEvent } = await import("../../src/events/entitlementDelete.js");

    await entitlementDeleteEvent(mockEntitlement() as never);
    expect(posthog.capture.calledOnce).toBe(true);
    expect(posthog.capture.firstCall.args[0].event).toBe("premium_deleted");
  });

  it("should handle DB update failure gracefully", async () => {
    const db = mockDb();
    const logger = mockLogger();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.update.returns(chain);

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/posthog.js", () => ({ default: mockPosthog() }));
    const { entitlementDeleteEvent } = await import("../../src/events/entitlementDelete.js");

    await entitlementDeleteEvent(mockEntitlement({ guildId: "g1" }) as never);
    expect(logger.error.calledOnce).toBe(true);
  });
});
