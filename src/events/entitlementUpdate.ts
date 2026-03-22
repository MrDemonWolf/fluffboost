import type { Entitlement } from "discord.js";

import logger from "../utils/logger.js";
import { updateGuildPremiumStatus } from "../utils/entitlementHelpers.js";

export async function entitlementUpdateEvent(
  _oldEntitlement: Entitlement | null,
  newEntitlement: Entitlement
): Promise<void> {
  const isCancelled = newEntitlement.endsAt !== null;

  logger.info(
    "Discord - Event (Entitlement Update)",
    isCancelled ? "Premium subscription cancelled" : "Premium subscription renewed",
    {
      userId: newEntitlement.userId,
      skuId: newEntitlement.skuId,
      guildId: newEntitlement.guildId ?? undefined,
      endsAt: newEntitlement.endsAt?.toISOString(),
      timestamp: new Date().toISOString(),
    }
  );

  await updateGuildPremiumStatus(newEntitlement, !isCancelled, "Entitlement Update");
}
