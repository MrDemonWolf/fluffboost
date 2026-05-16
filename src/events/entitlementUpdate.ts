import type { Entitlement } from "discord.js";

import { logEntitlementEvent, updateGuildPremiumStatus } from "../utils/entitlementHelpers.js";

export async function entitlementUpdateEvent(
  _oldEntitlement: Entitlement | null,
  newEntitlement: Entitlement
): Promise<void> {
  const isCancelled = newEntitlement.endsAt !== null;

  logEntitlementEvent(
    "Entitlement Update",
    isCancelled ? "Premium subscription cancelled" : "Premium subscription renewed",
    newEntitlement,
    { endsAt: newEntitlement.endsAt?.toISOString() }
  );

  await updateGuildPremiumStatus(newEntitlement, !isCancelled, "Entitlement Update");
}
