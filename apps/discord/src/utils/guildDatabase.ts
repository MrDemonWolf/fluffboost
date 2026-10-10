import type { Client } from "discord.js";
import { inArray } from "drizzle-orm";

import { db } from "../database/index.js";
import { guilds } from "../database/schema.js";
import logger from "./logger.js";

/** Keep each multi-row statement well under Postgres's bind-parameter limit. */
const GUILD_BATCH_SIZE = 1000;

function chunk<T>(items: readonly T[], size = GUILD_BATCH_SIZE): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Insert any missing guild rows in set-based batches. Idempotent: rows created
 * concurrently (e.g. by guildCreate) are skipped instead of raising 23505.
 */
async function ensureGuildRows(guildIds: readonly string[]): Promise<void> {
  for (const ids of chunk(guildIds)) {
    await db.insert(guilds).values(ids.map((guildId) => ({ guildId })))
      .onConflictDoNothing({ target: guilds.guildId });
  }
}

export async function pruneGuilds(client: Client) {
  try {
    const guildsInDb = await db.select({ guildId: guilds.guildId }).from(guilds);

    if (guildsInDb.length === 0) {
      logger.info(
        "Discord Event Logger",
        "No guilds found in the database for cleanup"
      );
      return;
    }

    /**
     * Note: an empty guild cache is NOT an early-return — by the time ready
     * fires the cache is authoritative for this shard, and a shard with zero
     * guilds must still be able to prune its stale rows.
     */
    /**
     * Under ShardingManager each process only caches its own shard's guilds,
     * so "not in cache" may only be evaluated for guilds routed to this shard
     * — otherwise every shard deletes every other shard's rows. Discord routes
     * a guild to shard (guildId >> 22) % shardCount.
     */
    const shardIds = client.shard?.ids ?? null;
    const shardCount = client.shard?.count ?? 1;
    const belongsToThisShard = (guildId: string): boolean => {
      if (shardIds === null) {
        return true;
      }
      try {
        return shardIds.includes(Number(BigInt(guildId) >> 22n) % shardCount);
      } catch {
        // Malformed (non-numeric) guildId row — leave it alone.
        return false;
      }
    };

    const guildsToRemove = guildsInDb.filter(
      (guild: { guildId: string }) =>
        belongsToThisShard(guild.guildId) && client.guilds.cache.get(guild.guildId) === undefined
    );

    if (guildsToRemove.length === 0) {
      logger.info(
        "Discord Event Logger",
        "No guilds to remove from the database"
      );
      return;
    }

    logger.info("Discord - Guild Database", "Starting guild cleanup", {
      guildsToRemove: guildsToRemove.length,
    });

    let removed = 0;
    for (const ids of chunk(guildsToRemove.map((guild) => guild.guildId))) {
      try {
        await db.delete(guilds).where(inArray(guilds.guildId, ids));
        removed += ids.length;
      } catch (err) {
        logger.error(
          "Discord Event Logger",
          "Error removing guilds from database",
          err,
          {
            guildIds: ids,
          }
        );
      }
    }
    if (removed > 0) {
      logger.success("Discord - Guild Database", "Removed guilds from database", { removed });
    }
    logger.info(
      "Discord Event Logger",
      "Finished cleaning up guilds in the database"
    );
  } catch (err) {
    logger.error(
      "Discord Event Logger",
      "Error during cleaning of the database",
      err,
      {
        operation: "pruneGuilds",
      }
    );
  }
}

export async function ensureGuildExists(client: Client) {
  try {
    const guildIds = [...client.guilds.cache.keys()];
    if (guildIds.length === 0) {
      logger.info(
        "Discord Event Logger",
        "No guilds to ensure in the database"
      );
      return;
    }

    await ensureGuildRows(guildIds);
    logger.info(
      "Discord Event Logger",
      "Finished ensuring guilds exist in the database",
      {
        guilds: guildIds.length,
      }
    );
  } catch (err) {
    logger.error(
      "Discord Event Logger",
      "Error during ensuring guild exists in the database",
      err,
      {
        operation: "ensureGuildExists",
      }
    );
  }
}

/** Ensure one guild row exists. Always resolves true; kept for existing callers. */
export async function guildExists(guildId: string) {
  await ensureGuildRows([guildId]);
  return true;
}
