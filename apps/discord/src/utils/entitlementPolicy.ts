/**
 * Single source of truth for which entitlements unlock Premium. Used by command gating (premium.ts), the
 * gateway event handlers and the periodic reconciliation, so all three agree.
 */
import { EntitlementType } from "discord.js";
import type { Entitlement } from "discord.js";

/**
 * The entitlement fields the policy reads. A structural subset so plain objects
 * (API data, test fakes) qualify; without `isTest`, a null `startsAt` marks an
 * owner test entitlement.
 */
export type PremiumEntitlement = Pick<Entitlement, "skuId" | "guildId"> &
  Partial<Pick<Entitlement, "deleted" | "startsAt" | "endsAt" | "type">> & { isTest?: () => boolean };

/**
 * The single policy for whether test grants (owner test entitlements and
 * Application Test Mode purchases) may unlock Premium. Only production ignores them.
 */
export function allowsTestEntitlements(nodeEnv: string): boolean {
  return nodeEnv !== "production";
}

/** Owner test entitlements have no start date; test-mode checkouts are typed TestModePurchase. */
export function isTestEntitlement(entitlement: PremiumEntitlement): boolean {
  const isOwnerTest = entitlement.isTest?.() ?? entitlement.startsAt === null;
  return isOwnerTest || entitlement.type === EntitlementType.TestModePurchase;
}

/**
 * A server subscription authorizes only its own guild during its valid term.
 * A missing `startsAt`/`endsAt` is unbounded on that side, so a cancelled
 * subscription stays active until its populated `endsAt`. Test entitlements
 * pass unless `options.allowTest` is explicitly false.
 */
export function isActivePremiumEntitlement(
  entitlement: PremiumEntitlement,
  skuId: string | undefined,
  guildId: string | null | undefined,
  now = Date.now(),
  options: { allowTest?: boolean } = {}
): boolean {
  if (!skuId || !guildId || entitlement.skuId !== skuId || entitlement.guildId !== guildId || entitlement.deleted) {
    return false;
  }
  if (options.allowTest === false && isTestEntitlement(entitlement)) {
    return false;
  }
  return (!entitlement.startsAt || entitlement.startsAt.getTime() <= now) &&
    (!entitlement.endsAt || entitlement.endsAt.getTime() > now);
}

/**
 * The end of the Premium term that the given entitlements grant this guild,
 * as stored in Guild.premiumEndsAt. Null when any active grant is open-ended
 * (a renewing subscription or a test grant), otherwise the latest endsAt.
 * Undefined when none of them is active.
 */
export function premiumTermEnd(
  entitlements: Iterable<PremiumEntitlement>,
  skuId: string | undefined,
  guildId: string | null | undefined,
  now = Date.now(),
  options: { allowTest?: boolean } = {}
): Date | null | undefined {
  let end: Date | null | undefined;
  for (const entitlement of entitlements) {
    if (!isActivePremiumEntitlement(entitlement, skuId, guildId, now, options)) {
      continue;
    }
    end = mergeTermEnd(end, entitlement.endsAt ?? null);
  }
  return end;
}

/** Combine two term ends for one guild: open-ended (null) wins, otherwise the later date. */
export function mergeTermEnd(current: Date | null | undefined, next: Date | null): Date | null {
  if (current === undefined) {
    return next;
  }
  if (current === null || next === null) {
    return null;
  }
  return next.getTime() > current.getTime() ? next : current;
}
