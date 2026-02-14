import { expect } from "chai";
import esmock from "esmock";
import { mockEnv } from "../helpers.js";

describe("premium", () => {
  describe("isPremiumEnabled", () => {
    it("should return true when PREMIUM_ENABLED is true", async () => {
      const { isPremiumEnabled } = await esmock("../../src/utils/premium.js", {
        "../../src/utils/env.js": { default: mockEnv({ PREMIUM_ENABLED: true, DISCORD_PREMIUM_SKU_ID: "sku-1" }) },
      });
      expect(isPremiumEnabled()).to.be.true;
    });

    it("should return false when PREMIUM_ENABLED is false", async () => {
      const { isPremiumEnabled } = await esmock("../../src/utils/premium.js", {
        "../../src/utils/env.js": { default: mockEnv({ PREMIUM_ENABLED: false }) },
      });
      expect(isPremiumEnabled()).to.be.false;
    });
  });

  describe("getPremiumSkuId", () => {
    it("should return the SKU ID when configured", async () => {
      const { getPremiumSkuId } = await esmock("../../src/utils/premium.js", {
        "../../src/utils/env.js": { default: mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-abc" }) },
      });
      expect(getPremiumSkuId()).to.equal("sku-abc");
    });

    it("should return undefined when not configured", async () => {
      const { getPremiumSkuId } = await esmock("../../src/utils/premium.js", {
        "../../src/utils/env.js": { default: mockEnv({ DISCORD_PREMIUM_SKU_ID: undefined }) },
      });
      expect(getPremiumSkuId()).to.be.undefined;
    });
  });

  describe("hasEntitlement", () => {
    it("should return true when interaction has matching SKU entitlement", async () => {
      const { hasEntitlement } = await esmock("../../src/utils/premium.js", {
        "../../src/utils/env.js": { default: mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-match" }) },
      });

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
      expect(hasEntitlement(interaction as never)).to.be.true;
    });

    it("should return false when no matching entitlement", async () => {
      const { hasEntitlement } = await esmock("../../src/utils/premium.js", {
        "../../src/utils/env.js": { default: mockEnv({ DISCORD_PREMIUM_SKU_ID: "sku-match" }) },
      });

      const entitlements = new Map([["ent-1", { skuId: "sku-other" }]]);
      (entitlements as unknown as { some: (fn: (e: { skuId: string }) => boolean) => boolean }).some =
        function (fn: (e: { skuId: string }) => boolean) {
          for (const v of this.values()) {
            if (fn(v)) return true;
          }
          return false;
        };

      const interaction = { entitlements };
      expect(hasEntitlement(interaction as never)).to.be.false;
    });

    it("should return false when no SKU is configured", async () => {
      const { hasEntitlement } = await esmock("../../src/utils/premium.js", {
        "../../src/utils/env.js": { default: mockEnv({ DISCORD_PREMIUM_SKU_ID: undefined }) },
      });

      const entitlements = new Map([["ent-1", { skuId: "sku-any" }]]);
      const interaction = { entitlements };
      expect(hasEntitlement(interaction as never)).to.be.false;
    });
  });
});
