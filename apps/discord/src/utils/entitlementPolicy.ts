import type { Entitlement } from "discord.js";

export type PremiumEntitlement = Pick<Entitlement, "skuId" | "guildId"> &
  Partial<Pick<Entitlement, "deleted" | "startsAt" | "endsAt">> & { isTest?: () => boolean };

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
  const isTest = entitlement.isTest?.() ?? entitlement.startsAt === null;
  if (options.allowTest === false && isTest) {
    return false;
  }
  return (!entitlement.startsAt || entitlement.startsAt.getTime() <= now) &&
    (!entitlement.endsAt || entitlement.endsAt.getTime() > now);
}
