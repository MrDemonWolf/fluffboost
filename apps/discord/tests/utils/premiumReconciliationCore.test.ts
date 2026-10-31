/**
 * Tests the pure Premium snapshot pagination and write planning in src/utils/premiumReconciliationCore.ts,
 * with an injected page fetcher in place of Discord's entitlements API.
 */
import { describe, expect, it } from "bun:test";
import { EntitlementType } from "discord.js";
import type { Entitlement, FetchEntitlementsOptions } from "discord.js";
import {
  activePremiumGuilds, activePremiumTerms, groupGrantsByTermEnd, planPremiumWrites,
} from "../../src/utils/premiumReconciliationCore.js";

const grant = (id: string, guildId: string, changes = {}) => ({
  id, guildId, skuId: "123", deleted: false, startsAt: new Date(0), endsAt: null,
  isTest: () => false, ...changes,
}) as unknown as Entitlement;

const fullPage = (from: number, guildId?: string) => new Map(Array.from({ length: 100 }, (_, i) => {
  const id = String(from + i);
  return [id, grant(id, guildId ?? `guild-${from + i}`)] as const;
}));

describe("Premium startup snapshot", () => {
  it("anchors an ascending walk at after=0 and reads until an empty page", async () => {
    const requests: FetchEntitlementsOptions[] = [];
    const pages = [fullPage(1000), new Map([["1100", grant("1100", "last-guild")]]), new Map()];
    const active = await activePremiumGuilds(async (options) => {
      requests.push(options);
      return pages[requests.length - 1] ?? new Map();
    }, "123", false);
    expect(active).toHaveLength(101);
    expect(active).toContain("last-guild");
    expect(requests.map((r) => r.after)).toEqual(["0", "1099", "1100"]);
  });

  it("keeps walking past a short page that server-side filters produced", async () => {
    const requests: FetchEntitlementsOptions[] = [];
    const pages = [new Map([["5", grant("5", "early")]]), new Map([["9", grant("9", "later")]]), new Map()];
    const active = await activePremiumGuilds(async (options) => {
      requests.push(options);
      return pages[requests.length - 1] ?? new Map();
    }, "123", false);
    expect(active.sort()).toEqual(["early", "later"]);
    expect(requests).toHaveLength(3);
  });

  it("scopes a guild reconcile to that guild while keeping the cursor", async () => {
    const requests: FetchEntitlementsOptions[] = [];
    await activePremiumGuilds(async (options) => {
      requests.push(options);
      return new Map();
    }, "123", false, "g1");
    expect(requests[0]).toMatchObject({ guild: "g1", after: "0", skus: ["123"], excludeEnded: true });
  });

  it("throws instead of looping when pagination does not advance", async () => {
    const stuck = new Map([["7", grant("7", "g")]]);
    let calls = 0;
    await expect(activePremiumGuilds(async () => {
      if (++calls > 5) {throw new Error("looped");}
      return stuck;
    }, "123", false)).rejects.toThrow("Entitlement pagination did not advance");
  });

  it("does not return a partial snapshot when a later page fails", async () => {
    let pages = 0;
    const fetchPage = async () => {
      if (++pages === 2) {throw new Error("Discord unavailable");}
      return fullPage(1000, "g");
    };
    await expect(activePremiumGuilds(fetchPage, "123", false)).rejects.toThrow("Discord unavailable");
  });

  it("ignores expired, other-SKU, deleted and test grants in production", async () => {
    const entries = [
      grant("1", "valid"), grant("2", "expired", { endsAt: new Date(0) }),
      grant("3", "other", { skuId: "456" }), grant("4", "deleted", { deleted: true }),
      grant("5", "test", { startsAt: null, isTest: () => true }),
      grant("6", "test-mode", { type: EntitlementType.TestModePurchase }),
    ];
    let calls = 0;
    const fetchPage = async () => (++calls === 1 ? new Map(entries.map((e) => [e.id, e])) : new Map());
    expect(await activePremiumGuilds(fetchPage, "123", false)).toEqual(["valid"]);
  });
});

describe("activePremiumTerms", () => {
  it("keys active guilds by their merged term end", async () => {
    const soon = new Date("2099-01-01T00:00:00Z");
    const later = new Date("2099-06-01T00:00:00Z");
    const entries = [
      grant("1", "a", { endsAt: soon }), grant("2", "a", { endsAt: later }),
      grant("3", "b", { endsAt: soon }), grant("4", "b"),
      grant("5", "c", { endsAt: soon }), grant("6", "c", { endsAt: new Date(0) }),
    ];
    let calls = 0;
    const fetchPage = async () => (++calls === 1 ? new Map(entries.map((e) => [e.id, e])) : new Map());
    const terms = await activePremiumTerms(fetchPage, "123", false);
    expect(Object.fromEntries(terms)).toEqual({ a: later, b: null, c: soon });
  });
});

describe("groupGrantsByTermEnd", () => {
  it("groups guilds sharing a term end into one write", () => {
    const end = new Date("2099-01-01T00:00:00Z");
    const terms = new Map<string, Date | null>([
      ["g1", null], ["g2", end], ["g3", null], ["g4", new Date(end.getTime())],
    ]);
    expect(groupGrantsByTermEnd(["g1", "g2", "g3", "g4"], terms)).toEqual([
      { premiumEndsAt: null, guildIds: ["g1", "g3"] },
      { premiumEndsAt: end, guildIds: ["g2", "g4"] },
    ]);
  });
});

describe("planPremiumWrites", () => {
  it("revokes only rows that were premium before the snapshot and are no longer active", () => {
    expect(planPremiumWrites(["g1", "g2", "g3"], ["g1", "g2"], ["g2"])).toEqual({ revoke: ["g1"], grant: ["g2"] });
  });

  it("never revokes a guild granted while the snapshot was in flight", () => {
    // g1 was not premium when reconcile started; an ENTITLEMENT_CREATE may set it meanwhile.
    expect(planPremiumWrites(["g1"], [], [])).toEqual({ revoke: [], grant: [] });
  });

  it("ignores guilds owned by other shards", () => {
    expect(planPremiumWrites(["g1"], ["g1", "other"], ["other"])).toEqual({ revoke: ["g1"], grant: [] });
  });
});
