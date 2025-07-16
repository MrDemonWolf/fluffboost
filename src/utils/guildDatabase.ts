import type { Client } from "discord.js";
import { prisma } from "../database";

export async function pruneGuilds(client: Client) {
  try {
    const guildsInDb = await prisma.guild.findMany({});
    console.log("DEBUGGER: Guilds in DB:", guildsInDb);
  } catch (err) {
    console.error({
      message: `[Discord Event Logger - Clean up Guild Dataqbase] Error during cleaning of the database of guild: ${err}`,
      badge: true,
      level: "error",
      timestamp: new Date(),
    });
  }
}

export async function ensureGuildExists(client: Client) {}

export async function guildExists(guildId: string) {
  const guildExists = await prisma.guild.findUnique({
    where: {
      guildId,
    },
  });

  if (!guildExists) {
    await prisma.guild.create({
      data: {
        guildId,
      },
    });
    return false;
  }
  return true;
}
