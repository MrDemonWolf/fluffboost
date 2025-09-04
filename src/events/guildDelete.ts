import type { Guild } from "discord.js";

import { prisma } from "../database";
import posthog from "../utils/posthog";
import logger from "../utils/logger";

export async function guildDeleteEvent(guild: Guild): Promise<void> {
  try {
    /**
     * Delete the guild from the database.
     */
    await prisma.guild.delete({
      where: {
        guildId: guild.id,
      },
    });

    /**
     * Show the bot has left a guild in the console.
     */
    logger.discord.guildLeft(guild.name, guild.id);
    logger.database.operation("Guild removed from database", {
      guildId: guild.id,
    });

    posthog.capture({
      distinctId: guild.id,
      event: "guild left",
      properties: {
        environment: process.env.NODE_ENV,
        guildName: guild.name,
        guildId: guild.id,
      },
    });
  } catch (err) {
    logger.error("Discord", "Error leaving guild", err, {
      guildId: guild.id,
      guildName: guild.name,
    });
  }
}
