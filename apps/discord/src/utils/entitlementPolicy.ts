import { EntitlementType } from "discord.js";
import type { Entitlement } from "discord.js";

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

/** A server subscription authorizes only its own guild during its valid term. */
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
