import type { Guild } from "discord.js";

import { db } from "../database/index.js";
import { guilds } from "../database/schema.js";
import logger from "../utils/logger.js";
import { reconcilePremium } from "../utils/premiumReconciliation.js";

/**
 * GUILD_CREATE handler. discord.js emits it only for servers joined after the shard is ready (startup guilds
 * are synced by ready.ts). Creates the guild's row with default settings and syncs Premium from Discord, so a
 * server that subscribed before (re)inviting the bot is Premium right away. Errors are logged, never thrown.
 */
export async function guildCreateEvent(guild: Guild): Promise<void> {
  try {
    // Only the shard that owns this guild receives the event.
    logger.discord.guildJoined(guild.name, guild.id, guild.memberCount);

    /**
     * Add the guild to the database. Idempotent: a rejoin while the row still
     * exists (missed guildDelete, race with ensureGuildExists) is not an error.
     */
    const [guildData] = await db
      .insert(guilds)
      .values({ guildId: guild.id })
      .onConflictDoNothing({ target: guilds.guildId })
      .returning();

    // No-op unless PREMIUM_ENABLED. Runs before the success log, so a failure lands in the catch below.
    await reconcilePremium(guild.client, guild.id);

    if (guildData) {
      logger.database.operation("Guild added to database", {
        guildId: guildData.guildId,
      });
    } else {
      logger.info("Discord - Event (Guild Create)", "Guild already in database", {
        guildId: guild.id,
      });
    }

  } catch (err) {
    logger.error(
      "Discord - Event (Guild Create)",
      "Error joining a new guild",
      err,
      {
        guildId: guild.id,
        guildName: guild.name,
      }
    );
  }
}
