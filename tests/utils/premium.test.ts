import { describe, it, expect, beforeEach, mock } from "bun:test";
import { mockEnv } from "../helpers.js";

describe("premium", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("isPremiumEnabled", () => {
    it("should return true when PREMIUM_ENABLED is true", async () => {
      mock.module("../../src/utils/env.js", () => ({
        default: mockEnv({ PREMIUM_ENABLED: true, DISCORD_PREMIUM_SKU_ID: "sku-1" }),
      }));
      const { isPremiumEnabled } = await import("../../src/utils/premium.js");
      expect(isPremiumEnabled()).toBe(true);
    });

    it("should return false when PREMIUM_ENABLED is false", async () => {
      mock.module("../../src/utils/env.js", () => ({
        default: mockEnv({ PREMIUM_ENABLED: false }),
      }));
      const { isPremiumEnabled } = await import("../../src/utils/premium.js");
      expect(isPremiumEnabled()).toBe(false);
    });
  });

  describe("getPremiumSkuId", () => {
    it("should return the SKU ID when configured", async () => {
      mock.module("../../src/utils/env.js", () => ({
        default: mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-abc" }),
      }));
      const { getPremiumSkuId } = await import("../../src/utils/premium.js");
      expect(getPremiumSkuId()).toBe("sku-abc");
    });

    it("should return undefined when not configured", async () => {
      mock.module("../../src/utils/env.js", () => ({
        default: mockEnv({ DISCORD_PREMIUM_SKU_ID: undefined }),
      }));
      const { getPremiumSkuId } = await import("../../src/utils/premium.js");
      expect(getPremiumSkuId()).toBeUndefined();
    });
  });

  describe("hasEntitlement", () => {
    it("should return true when interaction has matching SKU entitlement", async () => {
      mock.module("../../src/utils/env.js", () => ({
        default: mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-match" }),
      }));
      const { hasEntitlement } = await import("../../src/utils/premium.js");

      const entitlements = new Map([["ent-1", { skuId: "sku-match" }]]);
      // Collection.some iterates values, so we need a some method
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

    it("should return false when no matching entitlement", async () => {
      mock.module("../../src/utils/env.js", () => ({
        default: mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-match" }),
      }));
      const { hasEntitlement } = await import("../../src/utils/premium.js");

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

    it("should return false when no SKU is configured", async () => {
      mock.module("../../src/utils/env.js", () => ({
        default: mockEnv({ DISCORD_PREMIUM_SKU_ID: undefined }),
      }));
      const { hasEntitlement } = await import("../../src/utils/premium.js");

      const entitlements = new Map([["ent-1", { skuId: "sku-any" }]]);
      const interaction = { entitlements };
      expect(hasEntitlement(interaction as never)).toBe(false);
    });
  });
});
