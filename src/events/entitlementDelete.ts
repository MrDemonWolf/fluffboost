import type { Entitlement } from "discord.js";

import logger from "../utils/logger.js";
import { eq } from "drizzle-orm";

import { db } from "../database/index.js";
import { guilds } from "../database/schema.js";

export async function entitlementDeleteEvent(entitlement: Entitlement): Promise<void> {
  logger.info("Discord - Event (Entitlement Delete)", "Premium entitlement removed", {
    userId: entitlement.userId,
    skuId: entitlement.skuId,
    guildId: entitlement.guildId ?? undefined,
    timestamp: new Date().toISOString(),
  });

  if (entitlement.guildId) {
    try {
      await db.update(guilds).set({ isPremium: false }).where(eq(guilds.guildId, entitlement.guildId));
    } catch (err) {
      logger.error("Discord - Event (Entitlement Delete)", "Failed to update guild premium status", err, {
        guildId: entitlement.guildId,
      });
    }
  }
}
