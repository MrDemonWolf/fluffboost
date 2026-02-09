import type { Entitlement } from "discord.js";

import logger from "../utils/logger.js";
import posthog from "../utils/posthog.js";

export function entitlementCreateEvent(entitlement: Entitlement): void {
  logger.info("Discord - Event (Entitlement Create)", "New premium subscription", {
    userId: entitlement.userId,
    skuId: entitlement.skuId,
    guildId: entitlement.guildId ?? undefined,
    timestamp: new Date().toISOString(),
  });

  posthog.capture({
    distinctId: entitlement.userId ?? "unknown",
    event: "premium_subscribed",
    properties: {
      environment: process.env["NODE_ENV"],
      userId: entitlement.userId,
      skuId: entitlement.skuId,
      guildId: entitlement.guildId,
    },
  });
}
