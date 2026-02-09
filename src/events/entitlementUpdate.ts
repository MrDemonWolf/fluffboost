import type { Entitlement } from "discord.js";

import logger from "../utils/logger.js";
import posthog from "../utils/posthog.js";
import { prisma } from "../database/index.js";

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

  if (newEntitlement.guildId) {
    try {
      await prisma.guild.update({
        where: { guildId: newEntitlement.guildId },
        data: { isPremium: !isCancelled },
      });
    } catch (err) {
      logger.error("Discord - Event (Entitlement Update)", "Failed to update guild premium status", err, {
        guildId: newEntitlement.guildId,
      });
    }
  }

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
