import type { Guild } from "discord.js";

import { eq } from "drizzle-orm";

import { db } from "../database/index.js";
import { guilds } from "../database/schema.js";
import logger from "../utils/logger.js";

/**
 * GUILD_DELETE handler: the bot was removed (kicked, or the server was deleted). Deletes the guild's row,
 * which holds all of its settings. Outages do not reach here (discord.js emits guildUnavailable instead);
 * leaves missed while offline are cleaned up by pruneGuilds on the next ready. Errors are logged, never thrown.
 */
export async function guildDeleteEvent(guild: Guild): Promise<void> {
  try {
    await db.delete(guilds).where(eq(guilds.guildId, guild.id));

    logger.discord.guildLeft(guild.name, guild.id);
    logger.database.operation("Guild removed from database", {
      guildId: guild.id,
    });
  } catch (err) {
    logger.error("Discord - Event (Guild Delete)", "Error leaving guild", err, {
      guildId: guild.id,
      guildName: guild.name,
    });
  }
}
