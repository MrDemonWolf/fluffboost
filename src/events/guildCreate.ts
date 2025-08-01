import consola from "consola";

import type { Guild } from "discord.js";

import { prisma } from "../database";
import posthog from "../utils/posthog";

export async function guildCreateEvent(guild: Guild): Promise<void> {
  try {
    /**
     * Show the bot has joined a new guild in the console.
     * This is shared across all shards.
     */
    consola.success({
      message: `[Discord] Joined a new guild: ${guild.name} | Guild ID: ${guild.id}`,
      badge: true,
      timestamp: new Date(),
    });

    /**
     * Add the guild to the database.
     */
    const guildData = await prisma.guild.create({
      data: {
        guildId: guild.id,
      },
    });

    consola.success({
      message: `[Discord] Added guild ${guildData.guildId} to the database.`,
      badge: true,
      timestamp: new Date(),
    });

    posthog.capture({
      distinctId: guild.id,
      event: "guild created",
      properties: {
        environment: process.env.NODE_ENV,
        guildName: guild.name,
        guildId: guild.id,
      },
    });
  } catch (err) {
    consola.error({
      message: `[Discord] Error joining a new guild: ${err}`,
      badge: true,
      timestamp: new Date(),
    });
  }
}
