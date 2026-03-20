import { describe, it, expect, beforeEach, mock } from "bun:test";
import { mockEnv } from "../helpers.js";

// Top-level mock — import premium once, control env values per test via Object.assign
const env = mockEnv();
mock.module("../../src/utils/env.js", () => ({ default: env }));

const { isPremiumEnabled, getPremiumSkuId, hasEntitlement } = await import("../../src/utils/premium.js");

describe("premium", () => {
  beforeEach(() => {
    Object.assign(env, mockEnv());
  });

  describe("isPremiumEnabled", () => {
    it("should return true when PREMIUM_ENABLED is true", () => {
      Object.assign(env, { PREMIUM_ENABLED: true, DISCORD_PREMIUM_SKU_ID: "sku-1" });
      expect(isPremiumEnabled()).toBe(true);
    });

    it("should return false when PREMIUM_ENABLED is false", () => {
      Object.assign(env, { PREMIUM_ENABLED: false });
      expect(isPremiumEnabled()).toBe(false);
    });
  });

  describe("getPremiumSkuId", () => {
    it("should return the SKU ID when configured", () => {
      Object.assign(env, { DISCORD_PREMIUM_SKU_ID: "sku-abc" });
      expect(getPremiumSkuId()).toBe("sku-abc");
    });

    it("should return undefined when not configured", () => {
      Object.assign(env, { DISCORD_PREMIUM_SKU_ID: undefined });
      expect(getPremiumSkuId()).toBeUndefined();
    });
  });

  describe("hasEntitlement", () => {
    it("should return true when interaction has matching SKU entitlement", () => {
      Object.assign(env, { DISCORD_PREMIUM_SKU_ID: "sku-match" });

      const entitlements = new Map([["ent-1", { skuId: "sku-match" }]]);
      (entitlements as unknown as { some: (fn: (e: { skuId: string }) => boolean) => boolean }).some =
        function (fn: (e: { skuId: string }) => boolean) {
          for (const v of this.values()) {
            if (fn(v)) return true;
          }
          return false;
        };

      const interaction = { entitlements };
      expect(hasEntitlement(interaction as never)).toBe(true);
    });

    it("should return false when no matching entitlement", () => {
      Object.assign(env, { DISCORD_PREMIUM_SKU_ID: "sku-match" });

      const entitlements = new Map([["ent-1", { skuId: "sku-other" }]]);
      (entitlements as unknown as { some: (fn: (e: { skuId: string }) => boolean) => boolean }).some =
        function (fn: (e: { skuId: string }) => boolean) {
          for (const v of this.values()) {
            if (fn(v)) return true;
          }
          return false;
        };

      const interaction = { entitlements };
      expect(hasEntitlement(interaction as never)).toBe(false);
    });

    it("should return false when no SKU is configured", () => {
      Object.assign(env, { DISCORD_PREMIUM_SKU_ID: undefined });

      const entitlements = new Map([["ent-1", { skuId: "sku-any" }]]);
      const interaction = { entitlements };
      expect(hasEntitlement(interaction as never)).toBe(false);
    });
  });
});
