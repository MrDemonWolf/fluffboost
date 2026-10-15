import type { Entitlement } from "discord.js";

import { logEntitlementEvent, updateGuildPremiumStatus } from "../utils/entitlementHelpers.js";

/**
 * ENTITLEMENT_CREATE handler (registered only when PREMIUM_ENABLED). Grants Premium to the entitlement's guild;
 * SKU, guild and test-entitlement filtering happen in updateGuildPremiumStatus.
 */
export async function entitlementCreateEvent(entitlement: Entitlement): Promise<void> {
  logEntitlementEvent("Entitlement Create", "New premium subscription", entitlement);
  await updateGuildPremiumStatus(entitlement, true, "Entitlement Create");
}
