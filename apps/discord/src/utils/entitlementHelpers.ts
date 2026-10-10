import type { Entitlement } from "discord.js";

import { eq } from "drizzle-orm";

import { db } from "../database/index.js";
import { guilds } from "../database/schema.js";
import logger from "./logger.js";
import env from "./env.js";
import { allowsTestEntitlements, isActivePremiumEntitlement, isTestEntitlement } from "./entitlementPolicy.js";
import { reconcilePremium } from "./premiumReconciliation.js";

/**
 * Log a uniform entitlement event payload (skuId, guildId, timestamp) to avoid
 * drift between entitlementCreate/Delete/Update handlers. The subscriber's user
 * ID is deliberately left out: info lines reach production logs, and the guild
 * is enough to operate on.
 */
export function logEntitlementEvent(
  eventName: string,
  message: string,
  entitlement: Entitlement,
  extras: Record<string, unknown> = {}
): void {
  logger.info(`Discord - Event (${eventName})`, message, {
    skuId: entitlement.skuId,
    guildId: entitlement.guildId ?? undefined,
    timestamp: new Date().toISOString(),
    ...extras,
  });
}

/** Per-guild tail of in-flight premium writes on this process. */
const pendingByGuild = new Map<string, Promise<void>>();

/**
 * Run premium writes for one guild in arrival order, so a resubscribe's grant
 * cannot be overwritten by the reconcile of the old grant's revoke event.
 */
async function serializeForGuild(guildId: string, task: () => Promise<void>): Promise<void> {
  const run = (pendingByGuild.get(guildId) ?? Promise.resolve()).catch(() => {}).then(task);
  pendingByGuild.set(guildId, run);
  try {
    await run;
  } finally {
    if (pendingByGuild.get(guildId) === run) {
      pendingByGuild.delete(guildId);
    }
  }
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
  const guildId = entitlement.guildId;
  if (!guildId || entitlement.skuId !== env.DISCORD_PREMIUM_SKU_ID) {
    return;
  }
  const allowTest = allowsTestEntitlements(env.NODE_ENV);
  if (!allowTest && isTestEntitlement(entitlement)) {
    return;
  }

  await serializeForGuild(guildId, async () => {
    try {
      const active = isPremium && isActivePremiumEntitlement(
        entitlement, env.DISCORD_PREMIUM_SKU_ID, guildId, Date.now(), { allowTest }
      );
      if (!active) {
        // Revoking one grant must not revoke another still-valid subscription.
        await reconcilePremium(entitlement.client, guildId);
        return;
      }
      await db.update(guilds).set({ isPremium: true }).where(eq(guilds.guildId, guildId));
    } catch (err) {
      logger.error(`Discord - Event (${eventName})`, "Failed to update guild premium status", err, {
        guildId,
      });
    }
  });
}
