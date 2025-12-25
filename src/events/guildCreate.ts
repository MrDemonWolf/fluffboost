import type { Guild } from "discord.js";

import { prisma } from "../database/index.js";
import posthog from "../utils/posthog.js";
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
    const guildData = await prisma.guild.create({
      data: {
        guildId: guild.id,
      },
    });

    logger.database.operation("Guild added to database", {
      guildId: guildData.guildId,
    });

    posthog.capture({
      distinctId: guild.id,
      event: "guild created",
      properties: {
        environment: process.env["NODE_ENV"],
        guildName: guild.name,
        guildId: guild.id,
      },
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
