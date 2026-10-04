import { describe, it, expect, beforeEach, mock } from "bun:test";
import sinon from "sinon";
import { mockDb, mockDbChain, mockLogger, mockEntitlement, mockEnv } from "../helpers.js";

const logger = mockLogger();
const db = mockDb();
const reconcile = sinon.stub().resolves();

mock.module("../../src/utils/logger.js", () => ({ default: logger }));
mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));

const { logEntitlementEvent, updateGuildPremiumStatus } = await import(
  "../../src/utils/entitlementHelpers.js"
);

describe("entitlementHelpers", () => {
  beforeEach(() => {
    reconcile.reset();
    reconcile.resolves();
    mock.module("../../src/utils/premiumReconciliation.js", () => ({ reconcilePremium: reconcile }));
    mock.module("../../src/utils/env.js", () => ({ default: mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-123" }) }));
    logger.info.resetHistory();
    logger.error.resetHistory();
    db.update.resetHistory();
    db.update.callsFake(() => mockDbChain([]));
  });

  describe("logEntitlementEvent", () => {
    it("logs the uniform payload with event name and extras", () => {
      const entitlement = mockEntitlement();

      logEntitlementEvent("Entitlement Update", "renewed", entitlement as never, { extra: 1 });

      expect(logger.info.calledOnce).toBe(true);
      const [component, message, payload] = logger.info.firstCall.args;
      expect(component).toBe("Discord - Event (Entitlement Update)");
      expect(message).toBe("renewed");
      expect(payload.userId).toBe(entitlement.userId);
      expect(payload.skuId).toBe(entitlement.skuId);
      expect(payload.guildId).toBe(entitlement.guildId);
      expect(payload.extra).toBe(1);
    });

    it("maps a null guildId to undefined", () => {
      const entitlement = mockEntitlement({ guildId: null });

      logEntitlementEvent("Entitlement Create", "created", entitlement as never);

      const payload = logger.info.firstCall.args[2];
      expect(payload.guildId).toBeUndefined();
    });
  });

  describe("updateGuildPremiumStatus", () => {
    it("does not change premium status for an unrelated SKU", async () => {
      await updateGuildPremiumStatus(mockEntitlement({ skuId: "unrelated" }) as never, true, "Entitlement Create");
      expect(db.update.called).toBe(false);
    });
    it("does not grant premium for expired entitlements", async () => {
      await updateGuildPremiumStatus(mockEntitlement({ endsAt: new Date(0) }) as never, true, "Entitlement Create");
      expect(reconcile.calledOnce).toBe(true);
      expect(db.update.called).toBe(false);
    });
    it("ignores production test events before changing a real paid guild", async () => {
      mock.module("../../src/utils/env.js", () => ({
        default: mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-123", NODE_ENV: "production" }),
      }));
      const testEntitlement = mockEntitlement({ startsAt: null, isTest: () => true });
      await updateGuildPremiumStatus(testEntitlement as never, false, "Entitlement Delete");
      expect(db.update.called).toBe(false);
      expect(reconcile.called).toBe(false);
    });
    it("updates the guild row when guildId is present", async () => {
      const entitlement = mockEntitlement();

      await updateGuildPremiumStatus(entitlement as never, true, "Entitlement Create");

      expect(db.update.calledOnce).toBe(true);
    });

    it("does nothing for user-scoped entitlements (no guildId)", async () => {
      const entitlement = mockEntitlement({ guildId: null });

      await updateGuildPremiumStatus(entitlement as never, true, "Entitlement Create");

      expect(db.update.called).toBe(false);
    });

    it("logs instead of throwing when the DB update fails", async () => {
      const chain = mockDbChain();
      chain.rejects(new Error("db down"));
      db.update.returns(chain);
      const entitlement = mockEntitlement();

      await updateGuildPremiumStatus(entitlement as never, true, "Entitlement Create");

      expect(logger.error.calledOnce).toBe(true);
    });
  });
});
