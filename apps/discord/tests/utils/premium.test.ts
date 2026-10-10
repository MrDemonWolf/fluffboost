import { describe, it, expect, beforeEach, mock } from "bun:test";
import { ButtonStyle, Collection, EntitlementType } from "discord.js";
import { mockEnv } from "../helpers.js";
import type { MockEnv } from "../helpers.js";
import {
  allowsTestEntitlements,
  isActivePremiumEntitlement,
  isTestEntitlement,
} from "../../src/utils/entitlementPolicy.js";
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
  it("treats Application Test Mode purchases as test grants even with a start date", () => {
    const testModePurchase = entitlement({ type: EntitlementType.TestModePurchase, isTest: () => false });
    expect(isTestEntitlement(testModePurchase)).toBe(true);
    expect(isActivePremiumEntitlement(testModePurchase, "premium-sku", "server-1", now)).toBe(true);
    expect(isActivePremiumEntitlement(testModePurchase, "premium-sku", "server-1", now, { allowTest: false }))
      .toBe(false);
  });
  it("keeps real paid subscriptions out of the test policy", () => {
    const paid = entitlement({ type: EntitlementType.ApplicationSubscription, isTest: () => false });
    expect(isTestEntitlement(paid)).toBe(false);
    expect(isTestEntitlement(entitlement())).toBe(false);
    expect(isActivePremiumEntitlement(paid, "premium-sku", "server-1", now, { allowTest: false })).toBe(true);
  });
  it("falls back to a missing start date when isTest() is unavailable", () => {
    expect(isTestEntitlement(entitlement({ startsAt: null }))).toBe(true);
  });
  it("keeps canceled subscriptions active through their paid billing period", () => {
    expect(isActivePremiumEntitlement(entitlement(), "premium-sku", "server-1", now, { allowTest: false }))
      .toBe(true);
  });
  it("denies test entitlements only in production", () => {
    expect(allowsTestEntitlements("production")).toBe(false);
    expect(allowsTestEntitlements("development")).toBe(true);
    expect(allowsTestEntitlements("test")).toBe(true);
  });
});

describe("hasEntitlement", () => {
  const sku = "premium-sku";
  const testGrant = { ...entitlement({ skuId: sku, guildId: "guild-123", startsAt: null, endsAt: null }),
    isTest: () => true };
  const paidGrant = { ...entitlement({ skuId: sku, guildId: "guild-123", startsAt: new Date(0), endsAt: null }),
    isTest: () => false };

  async function load(nodeEnv: MockEnv["NODE_ENV"]) {
    mock.module("../../src/utils/env.js", () => ({
      default: mockEnv({ NODE_ENV: nodeEnv, PREMIUM_ENABLED: true, DISCORD_PREMIUM_SKU_ID: sku }),
    }));
    return import("../../src/utils/premium.js");
  }
  const interaction = (...grants: object[]) =>
    ({ guildId: "guild-123", entitlements: new Collection(grants.map((g, i) => [String(i), g])) }) as never;

  beforeEach(() => {
    mock.module("../../src/utils/env.js", () => ({ default: mockEnv({ DISCORD_PREMIUM_SKU_ID: sku }) }));
  });

  it("rejects owner test entitlements on the production bot", async () => {
    const { hasEntitlement } = await load("production");
    expect(hasEntitlement(interaction(testGrant))).toBe(false);
    expect(hasEntitlement(interaction(paidGrant))).toBe(true);
  });
  it("accepts owner test entitlements outside production", async () => {
    const { hasEntitlement } = await load("development");
    expect(hasEntitlement(interaction(testGrant))).toBe(true);
  });
});

describe("premium config and upsell", () => {
  async function load(overrides: Partial<MockEnv>) {
    mock.module("../../src/utils/env.js", () => ({ default: mockEnv(overrides) }));
    return import("../../src/utils/premium.js");
  }

  it("reads the toggle and SKU from env", async () => {
    const premium = await load({ PREMIUM_ENABLED: true, DISCORD_PREMIUM_SKU_ID: "100000000000000777" });
    expect(premium.isPremiumEnabled()).toBe(true);
    expect(premium.getPremiumSkuId()).toBe("100000000000000777");
  });

  it("never grants Premium when no SKU is configured", async () => {
    const { hasEntitlement } = await load({ PREMIUM_ENABLED: true, DISCORD_PREMIUM_SKU_ID: undefined });
    const grant = { skuId: "anything", guildId: "guild-123", deleted: false, startsAt: null, endsAt: null,
      isTest: () => false };
    expect(hasEntitlement({ guildId: "guild-123", entitlements: new Collection([["0", grant]]) } as never))
      .toBe(false);
  });

  it("builds the upsell embed with a Premium SKU button when a SKU is configured", async () => {
    const { buildPremiumUpsell } = await load({ PREMIUM_ENABLED: true, DISCORD_PREMIUM_SKU_ID: "100000000000000777" });
    const upsell = buildPremiumUpsell({
      title: "FluffBoost Premium",
      description: "Upgrade",
      fields: [{ name: "Billing", value: "Monthly", inline: true }],
      footerText: "Thanks!",
    });

    expect(upsell.embeds).toHaveLength(1);
    const embed = upsell.embeds[0]!.toJSON();
    expect(embed.title).toBe("FluffBoost Premium");
    expect(embed.description).toBe("Upgrade");
    expect(embed.fields).toEqual([{ name: "Billing", value: "Monthly", inline: true }]);
    expect(embed.footer?.text).toBe("Thanks!");
    expect(upsell.components).toHaveLength(1);
    const button = upsell.components[0]!.toJSON().components[0] as { style: number; sku_id?: string };
    expect(button.style).toBe(ButtonStyle.Premium);
    expect(button.sku_id).toBe("100000000000000777");
  });

  it("omits the purchase button when no SKU is configured", async () => {
    const { buildPremiumUpsell } = await load({ PREMIUM_ENABLED: true, DISCORD_PREMIUM_SKU_ID: undefined });
    const upsell = buildPremiumUpsell({ title: "t", description: "d" });
    expect(upsell.embeds).toHaveLength(1);
    expect(upsell.components).toEqual([]);
  });
});
