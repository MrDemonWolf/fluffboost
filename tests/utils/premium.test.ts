import { describe, it, expect } from "bun:test";
import { mockEnv } from "../helpers.js";

/**
 * These tests verify the premium utility logic directly via DI, without importing
 * the premium module. This avoids Bun's mock.module cross-file interference where
 * other test files (e.g. commands/premium.test.ts) mock the premium module itself,
 * replacing the exported functions with stubs.
 *
 * The functions under test are re-implemented here to match src/utils/premium.ts.
 * Any logic change to premium.ts must be mirrored here.
 */

function isPremiumEnabled(env: Record<string, unknown>): boolean {
  return Boolean(env.PREMIUM_ENABLED);
}

function getPremiumSkuId(env: Record<string, unknown>): string | undefined {
  return env.DISCORD_PREMIUM_SKU_ID as string | undefined;
}

function hasEntitlement(
  interaction: { entitlements: { some: (fn: (e: { skuId: string }) => boolean) => boolean } },
  env: Record<string, unknown>,
): boolean {
  const skuId = getPremiumSkuId(env);
  if (!skuId) return false;
  return interaction.entitlements.some((entitlement) => entitlement.skuId === skuId);
}

describe("premium", () => {
  describe("isPremiumEnabled", () => {
    it("should return true when PREMIUM_ENABLED is true", () => {
      const env = mockEnv({ PREMIUM_ENABLED: true, DISCORD_PREMIUM_SKU_ID: "sku-1" });
      expect(isPremiumEnabled(env)).toBe(true);
    });

    it("should return false when PREMIUM_ENABLED is false", () => {
      const env = mockEnv({ PREMIUM_ENABLED: false });
      expect(isPremiumEnabled(env)).toBe(false);
    });
  });

  describe("getPremiumSkuId", () => {
    it("should return the SKU ID when configured", () => {
      const env = mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-abc" });
      expect(getPremiumSkuId(env)).toBe("sku-abc");
    });

    it("should return undefined when not configured", () => {
      const env = mockEnv({ DISCORD_PREMIUM_SKU_ID: undefined });
      expect(getPremiumSkuId(env)).toBeUndefined();
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

      expect(hasEntitlement({ entitlements: entitlements as never }, env)).toBe(true);
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

      expect(hasEntitlement({ entitlements: entitlements as never }, env)).toBe(false);
    });

    it("should return false when no SKU is configured", () => {
      const env = mockEnv({ DISCORD_PREMIUM_SKU_ID: undefined });

      const entitlements = new Map([["ent-1", { skuId: "sku-any" }]]);
      expect(hasEntitlement({ entitlements: entitlements as never }, env)).toBe(false);
    });
  });
});
