import type { Entitlement } from "discord.js";

import { logEntitlementEvent, updateGuildPremiumStatus } from "../utils/entitlementHelpers.js";
import { isActivePremiumEntitlement } from "../utils/entitlementPolicy.js";

/**
 * ENTITLEMENT_UPDATE handler (registered only when PREMIUM_ENABLED). Re-evaluates the updated entitlement:
 * still active grants Premium, otherwise the guild is reconciled against all of its entitlements.
 */
export async function entitlementUpdateEvent(
  _oldEntitlement: Entitlement | null,
  newEntitlement: Entitlement
): Promise<void> {
  // Discord sends updates when subscriptions end. A populated endsAt is a
  // validity boundary; a future end still grants access through the paid term.
  const endsAt = newEntitlement.endsAt;
  const isActive = isActivePremiumEntitlement(newEntitlement, newEntitlement.skuId, newEntitlement.guildId);

  logEntitlementEvent(
    "Entitlement Update",
    isActive ? "Premium entitlement remains active" : "Premium entitlement ended",
    newEntitlement,
    { endsAt: endsAt?.toISOString() }
  );

  await updateGuildPremiumStatus(newEntitlement, isActive, "Entitlement Update");
}
