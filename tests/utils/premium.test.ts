import { describe, it, expect, mock } from "bun:test";
import { mockEnv } from "../helpers.js";

// Mock env to prevent real env validation during import
mock.module("../../src/utils/env.js", () => ({ default: {} }));

const { isPremiumEnabled, getPremiumSkuId, hasEntitlement } = await import("../../src/utils/premium.js");

describe("premium", () => {
  describe("isPremiumEnabled", () => {
    it("should return true when PREMIUM_ENABLED is true", () => {
      const env = mockEnv({ PREMIUM_ENABLED: true, DISCORD_PREMIUM_SKU_ID: "sku-1" });
      expect(isPremiumEnabled({ env } as never)).toBe(true);
    });

    it("should return false when PREMIUM_ENABLED is false", () => {
      const env = mockEnv({ PREMIUM_ENABLED: false });
      expect(isPremiumEnabled({ env } as never)).toBe(false);
    });
  });

  describe("getPremiumSkuId", () => {
    it("should return the SKU ID when configured", () => {
      const env = mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-abc" });
      expect(getPremiumSkuId({ env } as never)).toBe("sku-abc");
    });

    it("should return undefined when not configured", () => {
      const env = mockEnv({ DISCORD_PREMIUM_SKU_ID: undefined });
      expect(getPremiumSkuId({ env } as never)).toBeUndefined();
    });
  });

  describe("hasEntitlement", () => {
    it("should return true when interaction has matching SKU entitlement", () => {
      const env = mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-match" });

      const entitlements = new Map([["ent-1", { skuId: "sku-match" }]]);
      (entitlements as unknown as { some: (fn: (e: { skuId: string }) => boolean) => boolean }).some =
        function (fn: (e: { skuId: string }) => boolean) {
          for (const v of this.values()) {
            if (fn(v)) return true;
          }
          return false;
        };

      const interaction = { entitlements };
      expect(hasEntitlement(interaction as never, { env } as never)).toBe(true);
    });

    it("should return false when no matching entitlement", () => {
      const env = mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-match" });

      const entitlements = new Map([["ent-1", { skuId: "sku-other" }]]);
      (entitlements as unknown as { some: (fn: (e: { skuId: string }) => boolean) => boolean }).some =
        function (fn: (e: { skuId: string }) => boolean) {
          for (const v of this.values()) {
            if (fn(v)) return true;
          }
          return false;
        };

      const interaction = { entitlements };
      expect(hasEntitlement(interaction as never, { env } as never)).toBe(false);
    });

    it("should return false when no SKU is configured", () => {
      const env = mockEnv({ DISCORD_PREMIUM_SKU_ID: undefined });

      const entitlements = new Map([["ent-1", { skuId: "sku-any" }]]);
      const interaction = { entitlements };
      expect(hasEntitlement(interaction as never, { env } as never)).toBe(false);
    });
  });
});
