import type { Entitlement, FetchEntitlementsOptions } from "discord.js";
import { isActivePremiumEntitlement } from "./entitlementPolicy.js";

/** Fetch the complete snapshot before any persistence can clear paid status. */
export async function activePremiumGuilds(
  fetchPage: (options: FetchEntitlementsOptions) => Promise<ReadonlyMap<string, Entitlement>>,
  skuId: string,
  allowTest: boolean,
  guildId?: string
): Promise<string[]> {
  const active = new Set<string>();
  let after: string | undefined;
  for (;;) {
    const page = await fetchPage({
      skus: [skuId], limit: 100, excludeEnded: true, excludeDeleted: true,
      cache: false, ...(after ? { after } : {}), ...(guildId ? { guild: guildId } : {}),
    });
    for (const entitlement of page.values()) {
      if (entitlement.guildId &&
        isActivePremiumEntitlement(entitlement, skuId, entitlement.guildId, Date.now(), { allowTest })) {
        active.add(entitlement.guildId);
      }
    }
    if (page.size < 100) {break;}
    const next = [...page.keys()].reduce((max, id) => BigInt(id) > BigInt(max) ? id : max);
    if (next === after) {throw new Error("Entitlement pagination did not advance");}
    after = next;
  }
  return [...active];
}
