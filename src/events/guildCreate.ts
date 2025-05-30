import type { Guild } from "discord.js";
import consola from "consola";
import { prisma } from "../database";
import posthog from "../utils/posthog";

export async function guildCreateEvent(guild: Guild): Promise<void> {
  try {
    /**
     * Show the bot has joined a new guild in the console.
     * This is shared across all shards.
     */
    consola.success({
      message: `Joined a new guild: ${guild.name} | Guild ID: ${guild.id}`,
      badge: true,
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
      message: `Added guild ${guildData.guildId} to the database.`,
      badge: true,
    });
    posthog.capture({
      distinctId: guild.id,
      event: "guild created",
      properties: {
        guildName: guild.name,
        guildId: guild.id,
      },
    });
  } catch (err) {
    consola.error({
      message: `Error joining a new guild: ${err}`,
      badge: true,
    });
  }
}
