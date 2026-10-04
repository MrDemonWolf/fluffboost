import type { Client } from "discord.js";
import { inArray } from "drizzle-orm";
import { db } from "../database/index.js";
import { guilds } from "../database/schema.js";
import env from "./env.js";
import { activePremiumGuilds } from "./premiumReconciliationCore.js";

/** Reconcile only this shard's servers, including purchases made while offline. */
export async function reconcilePremium(client: Client, guildId?: string): Promise<void> {
  if (!env.PREMIUM_ENABLED || !env.DISCORD_PREMIUM_SKU_ID) {return;}
  const ownedGuilds = guildId ? [guildId] : [...client.guilds.cache.keys()];
  if (!ownedGuilds.length) {return;}
  const application = client.application;
  if (!application) {throw new Error("Application is unavailable for Premium reconciliation");}
  const active = await activePremiumGuilds(
    (options) => application.entitlements.fetch(options),
    env.DISCORD_PREMIUM_SKU_ID, env.NODE_ENV !== "production", guildId
  );
  const owned = new Set(ownedGuilds);
  const activeOwned = active.filter((id) => owned.has(id));
  await db.transaction(async (tx) => {
    await tx.update(guilds).set({ isPremium: false }).where(inArray(guilds.guildId, ownedGuilds));
    if (activeOwned.length) {
      await tx.update(guilds).set({ isPremium: true }).where(inArray(guilds.guildId, activeOwned));
    }
  });
}
