import { describe, it, expect, beforeEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockEntitlement, mockEnv } from "../helpers.js";

const db = mockDb();
const logger = mockLogger();
const reconcile = sinon.stub().resolves();
mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
mock.module("../../src/utils/logger.js", () => ({ default: logger }));
mock.module("../../src/utils/premiumReconciliation.js", () => ({ reconcilePremium: reconcile }));
const { entitlementDeleteEvent } = await import("../../src/events/entitlementDelete.js");

describe("entitlementDeleteEvent", () => {
  beforeEach(() => {
    reconcile.reset();
    reconcile.resolves();
    db.update.resetHistory();
    logger.error.resetHistory();
    mock.module("../../src/utils/env.js", () => ({ default: mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-123" }) }));
  });
  it("reconciles the guild's remaining grants when a subscription is revoked", async () => {
    await entitlementDeleteEvent(mockEntitlement({ guildId: "g1" }) as never);
    expect(reconcile.calledOnce).toBe(true);
    expect(reconcile.firstCall.args[1]).toBe("g1");
    expect(db.update.called).toBe(false);
  });
  it("does not reconcile user-scoped entitlements", async () => {
    await entitlementDeleteEvent(mockEntitlement({ guildId: null }) as never);
    expect(reconcile.called).toBe(false);
  });
  it("keeps existing paid status when the reconciliation request fails", async () => {
    reconcile.rejects(new Error("Discord unavailable"));
    await entitlementDeleteEvent(mockEntitlement() as never);
    expect(logger.error.calledOnce).toBe(true);
    expect(db.update.called).toBe(false);
  });
});
