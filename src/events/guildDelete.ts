import type { Guild } from "discord.js";
import consola from "consola";
import { prisma } from "../database";

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
    });
  } catch (err) {
    consola.error({
      message: `Error leaving guild: ${err}`,
      badge: true,
    });
  }
}
