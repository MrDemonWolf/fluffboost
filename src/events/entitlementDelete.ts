import type { Entitlement } from "discord.js";

import logger from "../utils/logger.js";
import posthog from "../utils/posthog.js";
import { prisma } from "../database/index.js";

export async function entitlementDeleteEvent(entitlement: Entitlement): Promise<void> {
  logger.info("Discord - Event (Entitlement Delete)", "Premium entitlement removed", {
    userId: entitlement.userId,
    skuId: entitlement.skuId,
    guildId: entitlement.guildId ?? undefined,
    timestamp: new Date().toISOString(),
  });

  if (entitlement.guildId) {
    try {
      await prisma.guild.update({
        where: { guildId: entitlement.guildId },
        data: { isPremium: false },
      });
    } catch (err) {
      logger.error("Discord - Event (Entitlement Delete)", "Failed to update guild premium status", err, {
        guildId: entitlement.guildId,
      });
    }
  }

  posthog.capture({
    distinctId: entitlement.userId ?? "unknown",
    event: "premium_deleted",
    properties: {
      environment: process.env["NODE_ENV"],
      userId: entitlement.userId,
      skuId: entitlement.skuId,
      guildId: entitlement.guildId,
    },
  });
}
