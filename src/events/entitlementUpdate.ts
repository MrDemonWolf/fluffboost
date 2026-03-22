import type { Entitlement } from "discord.js";

import logger from "../utils/logger.js";
import { eq } from "drizzle-orm";

import { db } from "../database/index.js";
import { guilds } from "../database/schema.js";

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
      await db.update(guilds).set({ isPremium: !isCancelled }).where(eq(guilds.guildId, newEntitlement.guildId));
    } catch (err) {
      logger.error("Discord - Event (Entitlement Update)", "Failed to update guild premium status", err, {
        guildId: newEntitlement.guildId,
      });
    }
  }
}
