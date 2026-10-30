import type { Entitlement, FetchEntitlementsOptions } from "discord.js";
import { isActivePremiumEntitlement, mergeTermEnd } from "./entitlementPolicy.js";

type FetchEntitlementPage = (options: FetchEntitlementsOptions) => Promise<ReadonlyMap<string, Entitlement>>;

/** Fetch the complete snapshot before any persistence can clear paid status. */
export async function activePremiumGuilds(
  fetchPage: FetchEntitlementPage,
  skuId: string,
  allowTest: boolean,
  guildId?: string
): Promise<string[]> {
  return [...(await activePremiumTerms(fetchPage, skuId, allowTest, guildId)).keys()];
}

/**
 * The same complete snapshot, keyed by guild with the term end to store in
 * Guild.premiumEndsAt: null when any active grant is open-ended, otherwise the
 * latest endsAt across that guild's active grants.
 */
export async function activePremiumTerms(
  fetchPage: FetchEntitlementPage,
  skuId: string,
  allowTest: boolean,
  guildId?: string
): Promise<Map<string, Date | null>> {
  const active = new Map<string, Date | null>();
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
        active.set(entitlement.guildId, mergeTermEnd(active.get(entitlement.guildId), entitlement.endsAt ?? null));
      }
    }
    const next = [...page.keys()].reduce((max, id) => BigInt(id) > BigInt(max) ? id : max);
    if (BigInt(next) <= BigInt(after)) {throw new Error("Entitlement pagination did not advance");}
    after = next;
  }
  return active;
}

/**
 * Group granted guilds by the term end to write, so one UPDATE covers every
 * guild sharing a value (typically all open-ended subscriptions).
 */
export function groupGrantsByTermEnd(
  grant: readonly string[],
  terms: ReadonlyMap<string, Date | null>
): { premiumEndsAt: Date | null; guildIds: string[] }[] {
  const groups = new Map<number | null, { premiumEndsAt: Date | null; guildIds: string[] }>();
  for (const id of grant) {
    const premiumEndsAt = terms.get(id) ?? null;
    const key = premiumEndsAt?.getTime() ?? null;
    const group = groups.get(key) ?? { premiumEndsAt, guildIds: [] };
    group.guildIds.push(id);
    groups.set(key, group);
  }
  return [...groups.values()];
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
  activeGuilds: Iterable<string>
): PremiumWritePlan {
  const owned = new Set(ownedGuilds);
  const active = new Set([...activeGuilds].filter((id) => owned.has(id)));
  return {
    revoke: premiumBefore.filter((id) => owned.has(id) && !active.has(id)),
    grant: [...active],
  };
}
