import consola from "consola";

import type { Client } from "discord.js";

import posthog from "../utils/posthog";
import { prisma } from "../database";

export async function pruneGuilds(client: Client) {
  try {
    const guildsInDb = await prisma.guild.findMany({});

    const guildsInCache = client.guilds.cache.map((guild) => guild.id);

    /**
     * Double check if there are guilds in the database and cache. If not, return early.
     * This is to prevent issues if cache is empty or database is empty.
     */
    if (guildsInDb.length === 0) {
      consola.info({
        message: `[Discord Event Logger - Clean up Guild Database] No guilds found in the database.`,
        badge: true,
        timestamp: new Date(),
      });
      return;
    }

    if (guildsInCache.length === 0) {
      consola.info({
        message: `[Discord Event Logger - Clean up Guild Database] No guilds found in the cache.`,
        badge: true,
        timestamp: new Date(),
      });
      return;
    }
    const guildsToRemove = guildsInDb.filter(
      (guild) => client.guilds.cache.get(guild.guildId) === undefined
    );

    if (guildsToRemove.length === 0) {
      consola.info({
        message: `[Discord Event Logger - Clean up Guild Database] No guilds to remove from the database.`,
        badge: true,
        timestamp: new Date(),
      });
      return;
    }

    consola.info({
      message: `[Discord Event Logger - Clean up Guild Database] Found ${guildsToRemove.length} guilds to remove from the database.`,
      badge: true,
      timestamp: new Date(),
    });

    guildsToRemove.forEach(async (guild) => {
      try {
        await prisma.guild.delete({
          where: {
            guildId: guild.guildId,
          },
        });

        consola.success({
          message: `[Discord Event Logger - Clean up Guild Database] Removed guild ${guild.guildId} from the database`,
          badge: true,
          timestamp: new Date(),
        });

        posthog.capture({
          distinctId: guild.guildId,
          event: "guild left",
          properties: {
            environment: process.env.NODE_ENV,
            guildName: guild.guildId,
            guildId: guild.guildId,
          },
        });
      } catch (err) {
        consola.error({
          message: `[Discord Event Logger - Clean up Guild Database] Error removing guild from database: ${err}`,
          badge: true,
          timestamp: new Date(),
        });
      }
    });
    consola.info({
      message: `[Discord Event Logger - Clean up Guild Database] Finished cleaning up guilds in the database.`,
      badge: true,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error({
      message: `[Discord Event Logger - Clean up Guild Dataqbase] Error during cleaning of the database of guild: ${err}`,
      badge: true,
      timestamp: new Date(),
    });
  }
}

export async function ensureGuildExists(client: Client) {
  try {
    const currentGuilds = await prisma.guild.findMany({});
    const guildsToAdd = client.guilds.cache.filter(
      (guild) =>
        !currentGuilds.some((currentGuild) => currentGuild.guildId === guild.id)
    );

    if (guildsToAdd.size === 0) {
      consola.info({
        message: `[Discord Event Logger - Ensure Guild Exists] No new guilds to add to the database.`,
        badge: true,
        timestamp: new Date(),
      });
      return;
    }

    consola.info({
      message: `[Discord Event Logger - Ensure Guild Exists] Found ${guildsToAdd.size} guilds to add to the database.`,
      badge: true,
      timestamp: new Date(),
    });

    guildsToAdd.forEach(async (guild) => {
      try {
        await prisma.guild.create({
          data: {
            guildId: guild.id,
          },
        });

        consola.success({
          message: `[Discord Event Logger - ReadyEvt] Created guild ${guild.name} (ID: ${guild.id}) in the database`,
          badge: true,
          timestamp: new Date(),
        });

        posthog.capture({
          distinctId: guild.id,
          event: "guild joined",
          properties: {
            environment: process.env.NODE_ENV,
            guildName: guild.name,
            guildId: guild.id,
          },
        });
      } catch (err) {
        console.error({
          message: `[Discord Event Logger - Ensure Guild Exists] Error adding guild to the database: ${err}`,
          badge: true,
          timestamp: new Date(),
        });
      }
    });
    consola.info({
      message: `[Discord Event Logger - ReadyEvt] Finished ensuring guilds exist in the database.`,
      badge: true,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error({
      message: `[Discord Event Logger - Ensure Guild Exists] Error during ensuring guild exists in the database: ${err}`,
      badge: true,
      timestamp: new Date(),
    });
  }
}

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
