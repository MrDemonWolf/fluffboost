import { describe, it, expect } from "bun:test";
import { isActivePremiumEntitlement } from "../../src/utils/entitlementPolicy.js";
import type { PremiumEntitlement } from "../../src/utils/entitlementPolicy.js";

const now = new Date("2026-10-03T14:00:00Z").getTime();
function entitlement(overrides: Partial<PremiumEntitlement> = {}): PremiumEntitlement {
  return {
    skuId: "premium-sku", guildId: "server-1", deleted: false,
    startsAt: new Date(now - 60_000), endsAt: new Date(now + 60_000), ...overrides,
  };
}

describe("premium entitlement policy", () => {
  it("accepts an active subscription for this server and configured SKU", () => {
    expect(isActivePremiumEntitlement(entitlement(), "premium-sku", "server-1", now)).toBe(true);
  });
  it.each([
    ["unrelated SKU", { skuId: "another-sku" }],
    ["another server", { guildId: "server-2" }],
    ["user subscription", { guildId: null }],
    ["deleted entitlement", { deleted: true }],
    ["expired term", { endsAt: new Date(now - 1) }],
    ["term ending now", { endsAt: new Date(now) }],
    ["term not started", { startsAt: new Date(now + 1) }],
  ] as const)("rejects %s", (_name, overrides) => {
    expect(isActivePremiumEntitlement(entitlement(overrides), "premium-sku", "server-1", now)).toBe(false);
  });
  it("rejects entitlement checks outside a server", () => {
    expect(isActivePremiumEntitlement(entitlement(), "premium-sku", null, now)).toBe(false);
  });
  it("rejects entitlement checks without a configured SKU", () => {
    expect(isActivePremiumEntitlement(entitlement(), undefined, "server-1", now)).toBe(false);
  });
  it("allows local test subscriptions while denying them in production", () => {
    const testEntitlement = entitlement({ startsAt: null, endsAt: null, isTest: () => true });
    expect(isActivePremiumEntitlement(testEntitlement, "premium-sku", "server-1", now)).toBe(true);
    expect(isActivePremiumEntitlement(testEntitlement, "premium-sku", "server-1", now, { allowTest: false }))
      .toBe(false);
  });
  it("keeps canceled subscriptions active through their paid billing period", () => {
    expect(isActivePremiumEntitlement(entitlement(), "premium-sku", "server-1", now, { allowTest: false }))
      .toBe(true);
  });
});
