import type { Entitlement } from "discord.js";

import { logEntitlementEvent, updateGuildPremiumStatus } from "../utils/entitlementHelpers.js";

export async function entitlementCreateEvent(entitlement: Entitlement): Promise<void> {
  logEntitlementEvent("Entitlement Create", "New premium subscription", entitlement);
  await updateGuildPremiumStatus(entitlement, true, "Entitlement Create");
}
