import type { Entitlement } from "discord.js";

import { logEntitlementEvent, updateGuildPremiumStatus } from "../utils/entitlementHelpers.js";

/**
 * ENTITLEMENT_DELETE handler (registered only when PREMIUM_ENABLED). Discord sends this for refunds and
 * deletions (including test entitlements), not for normal expiry. Rather than clearing the flag outright,
 * updateGuildPremiumStatus re-reconciles the guild so another still-valid subscription keeps it Premium.
 */
export async function entitlementDeleteEvent(entitlement: Entitlement): Promise<void> {
  logEntitlementEvent("Entitlement Delete", "Premium entitlement removed", entitlement);
  await updateGuildPremiumStatus(entitlement, false, "Entitlement Delete");
}
