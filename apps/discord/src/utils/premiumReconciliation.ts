import type { Client } from "discord.js";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../database/index.js";
import { guilds } from "../database/schema.js";
import env from "./env.js";
import logger from "./logger.js";
import { allowsTestEntitlements } from "./entitlementPolicy.js";
import { activePremiumGuilds, planPremiumWrites } from "./premiumReconciliationCore.js";

const PREMIUM_RECONCILE_INTERVAL_MS = 30 * 60_000;

/** Reconcile only this shard's servers, including purchases made while offline. */
export async function reconcilePremium(client: Client, guildId?: string): Promise<void> {
  if (!env.PREMIUM_ENABLED || !env.DISCORD_PREMIUM_SKU_ID) {return;}
  const ownedGuilds = guildId ? [guildId] : [...client.guilds.cache.keys()];
  if (!ownedGuilds.length) {return;}
  const application = client.application;
  if (!application) {throw new Error("Application is unavailable for Premium reconciliation");}
  // Read before fetching: rows granted after this point are never revoked by this pass.
  const premiumBefore = await db.select({ guildId: guilds.guildId }).from(guilds)
    .where(and(inArray(guilds.guildId, ownedGuilds), eq(guilds.isPremium, true)));
  const active = await activePremiumGuilds(
    (options) => application.entitlements.fetch(options),
    env.DISCORD_PREMIUM_SKU_ID, allowsTestEntitlements(env.NODE_ENV), guildId
  );
  const { revoke, grant } = planPremiumWrites(ownedGuilds, premiumBefore.map((row) => row.guildId), active);
  if (!revoke.length && !grant.length) {return;}
  await db.transaction(async (tx) => {
    if (revoke.length) {
      await tx.update(guilds).set({ isPremium: false }).where(inArray(guilds.guildId, revoke));
    }
    if (grant.length) {
      await tx.update(guilds).set({ isPremium: true }).where(inArray(guilds.guildId, grant));
    }
  });
}

/**
 * Periodically re-reconcile this shard's guilds so ended terms, missed gateway
 * events and failed event writes heal without a restart. A failed fetch throws
 * before any write, so an outage never clears paid status. Returns a stop function.
 */
export function startPremiumReconciliationLoop(
  client: Client,
  intervalMs: number = PREMIUM_RECONCILE_INTERVAL_MS
): () => void {
  let running = false;
  const tick = async (): Promise<void> => {
    if (running) {return;}
    running = true;
    try {
      await reconcilePremium(client);
    } catch (err) {
      logger.error("Premium - Reconciliation", "Periodic Premium reconciliation failed", err, {
        shardIds: client.shard?.ids,
      });
    } finally {
      running = false;
    }
  };
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
