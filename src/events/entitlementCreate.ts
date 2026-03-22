import type { Entitlement } from "discord.js";

import logger from "../utils/logger.js";
import { updateGuildPremiumStatus } from "../utils/entitlementHelpers.js";

export async function entitlementCreateEvent(entitlement: Entitlement): Promise<void> {
  logger.info("Discord - Event (Entitlement Create)", "New premium subscription", {
    userId: entitlement.userId,
    skuId: entitlement.skuId,
    guildId: entitlement.guildId ?? undefined,
    timestamp: new Date().toISOString(),
  });

  await updateGuildPremiumStatus(entitlement, true, "Entitlement Create");
}
