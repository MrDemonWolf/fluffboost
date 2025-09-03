import consola from "consola";

import type { Client } from "discord.js";

import posthog from "../utils/posthog";
import { prisma } from "../database";
import logger from "./logger";

export async function pruneGuilds(client: Client) {
  try {
    const guildsInDb = await prisma.guild.findMany({});

    const guildsInCache = client.guilds.cache.map((guild) => guild.id);

    /**
     * Double check if there are guilds in the database and cache. If not, return early.
     * This is to prevent issues if cache is empty or database is empty.
     */
    if (guildsInDb.length === 0) {
      logger.info(
        "Discord Event Logger",
        "No guilds found in the database for cleanup"
      );
      return;
    }

    if (guildsInCache.length === 0) {
      logger.info(
        "Discord Event Logger",
        "No guilds found in the cache for cleanup"
      );
      return;
    }
    const guildsToRemove = guildsInDb.filter(
      (guild) => client.guilds.cache.get(guild.guildId) === undefined
    );

    if (guildsToRemove.length === 0) {
      logger.info(
        "Discord Event Logger",
        "No guilds to remove from the database"
      );
      return;
    }

    logger.info("Discord Event Logger", "Starting guild cleanup", {
      guildsToRemove: guildsToRemove.length,
    });

    guildsToRemove.forEach(async (guild) => {
      try {
        await prisma.guild.delete({
          where: {
            guildId: guild.guildId,
          },
        });

        logger.success("Discord Event Logger", "Removed guild from database", {
          guildId: guild.guildId,
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
        logger.error(
          "Discord Event Logger",
          "Error removing guild from database",
          err,
          {
            guildId: guild.guildId,
          }
        );
      }
    });
    logger.info(
      "Discord Event Logger",
      "Finished cleaning up guilds in the database"
    );
  } catch (err) {
    logger.error(
      "Discord Event Logger",
      "Error during cleaning of the database",
      err,
      {
        operation: "pruneGuilds",
      }
    );
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
      logger.info(
        "Discord Event Logger",
        "No new guilds to add to the database"
      );
      return;
    }

    logger.info("Discord Event Logger", "Adding new guilds to database", {
      guildsToAdd: guildsToAdd.size,
    });

    guildsToAdd.forEach(async (guild) => {
      try {
        await prisma.guild.create({
          data: {
            guildId: guild.id,
          },
        });

        logger.success("Discord Event Logger", "Created guild in database", {
          guildId: guild.id,
          guildName: guild.name,
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
        logger.error(
          "Discord Event Logger",
          "Error adding guild to the database",
          err,
          {
            operation: "ensureGuildExists",
            guildId: guild.id,
            guildName: guild.name,
          }
        );
      }
    });
    logger.info(
      "Discord Event Logger",
      "Finished ensuring guilds exist in the database"
    );
  } catch (err) {
    logger.error(
      "Discord Event Logger",
      "Error during ensuring guild exists in the database",
      err,
      {
        operation: "ensureGuildExists",
      }
    );
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
