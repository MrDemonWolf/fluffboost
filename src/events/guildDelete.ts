import consola from "consola";

import type { Guild } from "discord.js";

import { prisma } from "../database";
import posthog from "../utils/posthog";

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
    consola.success({
      message: `Left a guild: ${guild.name} | Guild ID: ${guild.id}. Removed guild from database.`,
      badge: true,
      timestamp: new Date(),
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
    consola.error({
      message: `Error leaving guild: ${err}`,
      badge: true,
      timestamp: new Date(),
    });
  }
}
