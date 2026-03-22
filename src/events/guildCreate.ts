import type { Guild } from "discord.js";

import { db } from "../database/index.js";
import { guilds } from "../database/schema.js";
import logger from "../utils/logger.js";

export async function guildCreateEvent(guild: Guild): Promise<void> {
  try {
    /**
     * Show the bot has joined a new guild in the console.
     * This is shared across all shards.
     */
    logger.discord.guildJoined(guild.name, guild.id, guild.memberCount);

    /**
     * Add the guild to the database.
     */
    const [guildData] = await db.insert(guilds).values({ guildId: guild.id }).returning();

    logger.database.operation("Guild added to database", {
      guildId: guildData?.guildId,
    });

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
