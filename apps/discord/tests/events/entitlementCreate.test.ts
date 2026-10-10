import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { EntitlementType } from "discord.js";
import type { SinonStub } from "sinon";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { mockLogger, mockDb, mockDbChain, mockEntitlement, mockEnv } from "../helpers.js";

describe("entitlementCreateEvent", () => {
  beforeEach(() => {
    mock.module("../../src/utils/env.js", () => ({ default: mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-123" }) }));
  });
  afterEach(() => {
    sinon.restore();
  });

  it("should update guild isPremium=true for guild-level entitlement", async () => {
    const db = mockDb();
    const logger = mockLogger();
    const chain = mockDbChain([]);
    db.update.returns(chain);

    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const { entitlementCreateEvent } = await import("../../src/events/entitlementCreate.js");

    await entitlementCreateEvent(mockEntitlement({ guildId: "g1" }) as never);

    expect(db.update.calledOnce).toBe(true);
    expect((chain["set"] as SinonStub).firstCall.args[0]).toEqual({ isPremium: true });
    const where = (chain["where"] as SinonStub).firstCall.args[0] as SQL;
    expect(new PgDialect().sqlToQuery(where).params).toEqual(["g1"]);
  });

  it("should not update DB for user-level entitlement (no guildId)", async () => {
    const db = mockDb();

    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    const { entitlementCreateEvent } = await import("../../src/events/entitlementCreate.js");

    await entitlementCreateEvent(mockEntitlement({ guildId: null }) as never);
    expect(db.update.called).toBe(false);
  });

  it("ignores Application Test Mode purchases on the production bot", async () => {
    const db = mockDb();
    mock.module("../../src/utils/env.js", () => ({
      default: mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-123", NODE_ENV: "production" }),
    }));
    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    const { entitlementCreateEvent } = await import("../../src/events/entitlementCreate.js");

    await entitlementCreateEvent(mockEntitlement({
      guildId: "g1", startsAt: new Date(0), type: EntitlementType.TestModePurchase, isTest: () => false,
    }) as never);
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
    const { entitlementCreateEvent } = await import("../../src/events/entitlementCreate.js");

    await entitlementCreateEvent(mockEntitlement({ guildId: "g1" }) as never);
    expect(logger.error.calledOnce).toBe(true);
  });
});
