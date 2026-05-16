import type { Entitlement } from "discord.js";

import { eq } from "drizzle-orm";

import { db } from "../database/index.js";
import { guilds } from "../database/schema.js";
import logger from "./logger.js";

/**
 * Log a uniform entitlement event payload (userId, skuId, guildId, timestamp)
 * to avoid drift between entitlementCreate/Delete/Update handlers.
 */
export function logEntitlementEvent(
  eventName: string,
  message: string,
  entitlement: Entitlement,
  extras: Record<string, unknown> = {}
): void {
  logger.info(`Discord - Event (${eventName})`, message, {
    userId: entitlement.userId,
    skuId: entitlement.skuId,
    guildId: entitlement.guildId ?? undefined,
    timestamp: new Date().toISOString(),
    ...extras,
  });
}

/**
 * Update a guild's premium status in the database based on an entitlement event.
 * Handles the guildId check, DB update, and error logging.
 */
export async function updateGuildPremiumStatus(
  entitlement: Entitlement,
  isPremium: boolean,
  eventName: string
): Promise<void> {
  if (!entitlement.guildId) {
    return;
  }

  try {
    await db.update(guilds).set({ isPremium }).where(eq(guilds.guildId, entitlement.guildId));
  } catch (err) {
    logger.error(`Discord - Event (${eventName})`, "Failed to update guild premium status", err, {
      guildId: entitlement.guildId,
    });
  }
}
