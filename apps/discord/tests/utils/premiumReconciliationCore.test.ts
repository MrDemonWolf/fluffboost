import { describe, expect, it } from "bun:test";
import type { Entitlement, FetchEntitlementsOptions } from "discord.js";
import { activePremiumGuilds } from "../../src/utils/premiumReconciliationCore.js";

const grant = (id: string, guildId: string, changes = {}) => ({
  id, guildId, skuId: "123", deleted: false, startsAt: new Date(0), endsAt: null,
  isTest: () => false, ...changes,
}) as unknown as Entitlement;

describe("Premium startup snapshot", () => {
  it("reads all pages before returning paid servers", async () => {
    const requests: FetchEntitlementsOptions[] = [];
    const firstPage = new Map(Array.from({ length: 100 }, (_, i) => {
      const id = String(1000 + i);
      return [id, grant(id, `guild-${i}`)] as const;
    }));
    const active = await activePremiumGuilds(async (options) => {
      requests.push(options);
      return requests.length === 1 ? firstPage : new Map([["1100", grant("1100", "last-guild")]]);
    }, "123", false);
    expect(active).toHaveLength(101);
    expect(active).toContain("last-guild");
    expect(requests[1]!.after).toBe("1099");
  });

  it("does not return a partial snapshot when a later page fails", async () => {
    let pages = 0;
    const fetchPage = async () => {
      if (++pages === 2) {throw new Error("Discord unavailable");}
      return new Map(Array.from({ length: 100 }, (_, i) => [String(i + 1000), grant(String(i + 1000), "g")]));
    };
    await expect(activePremiumGuilds(fetchPage, "123", false)).rejects.toThrow("Discord unavailable");
  });

  it("ignores expired, other-SKU, deleted and test grants in production", async () => {
    const entries = [
      grant("1", "valid"), grant("2", "expired", { endsAt: new Date(0) }),
      grant("3", "other", { skuId: "456" }), grant("4", "deleted", { deleted: true }),
      grant("5", "test", { startsAt: null, isTest: () => true }),
    ];
    expect(await activePremiumGuilds(async () => new Map(entries.map((e) => [e.id, e])), "123", false)).toEqual(["valid"]);
  });
});
