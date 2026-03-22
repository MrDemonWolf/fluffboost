import type { Entitlement } from "discord.js";

import logger from "../utils/logger.js";
import { eq } from "drizzle-orm";

import { db } from "../database/index.js";
import { guilds } from "../database/schema.js";

export async function entitlementCreateEvent(entitlement: Entitlement): Promise<void> {
  logger.info("Discord - Event (Entitlement Create)", "New premium subscription", {
    userId: entitlement.userId,
    skuId: entitlement.skuId,
    guildId: entitlement.guildId ?? undefined,
    timestamp: new Date().toISOString(),
  });

  if (entitlement.guildId) {
    try {
      await db.update(guilds).set({ isPremium: true }).where(eq(guilds.guildId, entitlement.guildId));
    } catch (err) {
      logger.error("Discord - Event (Entitlement Create)", "Failed to update guild premium status", err, {
        guildId: entitlement.guildId,
      });
    }
  }
}
