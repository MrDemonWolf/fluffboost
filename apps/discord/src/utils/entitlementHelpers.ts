import type { Entitlement } from "discord.js";

import { eq } from "drizzle-orm";

import { db } from "../database/index.js";
import { guilds } from "../database/schema.js";
import logger from "./logger.js";
import env from "./env.js";
import { isActivePremiumEntitlement } from "./entitlementPolicy.js";
import { reconcilePremium } from "./premiumReconciliation.js";

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
  if (!entitlement.guildId || entitlement.skuId !== env.DISCORD_PREMIUM_SKU_ID) {
    return;
  }
  if (env.NODE_ENV === "production" && (entitlement.isTest?.() ?? entitlement.startsAt === null)) {
    return;
  }

  try {
    const active = isPremium && isActivePremiumEntitlement(
      entitlement, env.DISCORD_PREMIUM_SKU_ID, entitlement.guildId, Date.now(), {
        allowTest: env.NODE_ENV !== "production",
      }
    );
    if (!active) {
      // Revoking one grant must not revoke another still-valid subscription.
      await reconcilePremium(entitlement.client, entitlement.guildId);
      return;
    }
    await db.update(guilds).set({ isPremium: true }).where(eq(guilds.guildId, entitlement.guildId));
  } catch (err) {
    logger.error(`Discord - Event (${eventName})`, "Failed to update guild premium status", err, {
      guildId: entitlement.guildId,
    });
  }
}
