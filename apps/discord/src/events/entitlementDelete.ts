import type { Entitlement } from "discord.js";

import { logEntitlementEvent, updateGuildPremiumStatus } from "../utils/entitlementHelpers.js";

export async function entitlementDeleteEvent(entitlement: Entitlement): Promise<void> {
  logEntitlementEvent("Entitlement Delete", "Premium entitlement removed", entitlement);
  await updateGuildPremiumStatus(entitlement, false, "Entitlement Delete");
}
