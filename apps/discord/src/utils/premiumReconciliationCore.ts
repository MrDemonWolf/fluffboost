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
  // Discord documents no default order, so anchor an ascending walk at "0" and
  // only stop on an empty page (server-side filters can shorten a page early).
  let after = "0";
  for (;;) {
    const options: FetchEntitlementsOptions = {
      skus: [skuId], limit: 100, excludeEnded: true, excludeDeleted: true, cache: false, after,
    };
    if (guildId) {
      options.guild = guildId;
    }
    const page = await fetchPage(options);
    if (page.size === 0) {break;}
    for (const entitlement of page.values()) {
      if (entitlement.guildId &&
        isActivePremiumEntitlement(entitlement, skuId, entitlement.guildId, Date.now(), { allowTest })) {
        active.add(entitlement.guildId);
      }
    }
    const next = [...page.keys()].reduce((max, id) => BigInt(id) > BigInt(max) ? id : max);
    if (BigInt(next) <= BigInt(after)) {throw new Error("Entitlement pagination did not advance");}
    after = next;
  }
  return [...active];
}

export interface PremiumWritePlan {
  revoke: string[];
  grant: string[];
}

/**
 * Decide the isPremium writes for one reconcile pass. Only rows that were
 * already premium before the snapshot was fetched may be cleared, so a grant
 * written by ENTITLEMENT_CREATE while the snapshot was in flight is not lost.
 */
export function planPremiumWrites(
  ownedGuilds: readonly string[],
  premiumBefore: readonly string[],
  activeGuilds: readonly string[]
): PremiumWritePlan {
  const owned = new Set(ownedGuilds);
  const active = new Set(activeGuilds.filter((id) => owned.has(id)));
  return {
    revoke: premiumBefore.filter((id) => owned.has(id) && !active.has(id)),
    grant: [...active],
  };
}
