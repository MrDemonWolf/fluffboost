import type { Entitlement } from "discord.js";

import { logEntitlementEvent, updateGuildPremiumStatus } from "../utils/entitlementHelpers.js";

export async function entitlementUpdateEvent(
  _oldEntitlement: Entitlement | null,
  newEntitlement: Entitlement
): Promise<void> {
  // Active subscriptions carry a populated endsAt for the current billing
  // period and ENTITLEMENT_UPDATE fires on renewal, so a non-null endsAt does
  // NOT mean cancelled. The entitlement is active until endsAt has passed;
  // actual revocation arrives via ENTITLEMENT_DELETE or a past endsAt.
  const endsAt = newEntitlement.endsAt;
  const isActive = endsAt === null || endsAt.getTime() > Date.now();

  logEntitlementEvent(
    "Entitlement Update",
    isActive ? "Premium subscription renewed" : "Premium subscription expired",
    newEntitlement,
    { endsAt: endsAt?.toISOString() }
  );

  await updateGuildPremiumStatus(newEntitlement, isActive, "Entitlement Update");
}
