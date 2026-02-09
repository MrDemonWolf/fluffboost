import type { Entitlement } from "discord.js";

import logger from "../utils/logger.js";
import posthog from "../utils/posthog.js";

export function entitlementUpdateEvent(
  _oldEntitlement: Entitlement | null,
  newEntitlement: Entitlement
): void {
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

  posthog.capture({
    distinctId: newEntitlement.userId ?? "unknown",
    event: "premium_updated",
    properties: {
      environment: process.env["NODE_ENV"],
      userId: newEntitlement.userId,
      skuId: newEntitlement.skuId,
      guildId: newEntitlement.guildId,
      cancelled: isCancelled,
      endsAt: newEntitlement.endsAt?.toISOString(),
    },
  });
}
