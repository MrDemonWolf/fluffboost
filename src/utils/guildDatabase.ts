import type { Client } from "discord.js";
import { eq, asc } from "drizzle-orm";

import posthog from "../utils/posthog.js";
import { db } from "../database/index.js";
import { guilds } from "../database/schema.js";
import logger from "./logger.js";
import env from "./env.js";

export async function pruneGuilds(client: Client) {
  try {
    const guildsInDb = await db.select().from(guilds).orderBy(asc(guilds.guildId));

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
      (guild: { guildId: string }) => client.guilds.cache.get(guild.guildId) === undefined
    );

    if (guildsToRemove.length === 0) {
      logger.info(
        "Discord Event Logger",
        "No guilds to remove from the database"
      );
      return;
    }

    logger.info("Discord - Guild Database", "Starting guild cleanup", {
      guildsToRemove: guildsToRemove.length,
    });

    for (const guild of guildsToRemove) {
      try {
        await db.delete(guilds).where(eq(guilds.guildId, guild.guildId));

        logger.success(
          "Discord - Guild Database",
          "Removed guild from database",
          {
            guildId: guild.guildId,
          }
        );

        posthog.capture({
          distinctId: guild.guildId,
          event: "guild left",
          properties: {
            environment: env.NODE_ENV,
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
    }
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
    const currentGuilds = await db.select().from(guilds).orderBy(asc(guilds.guildId));
    const guildsToAdd = client.guilds.cache.filter(
      (guild) =>
        !currentGuilds.some((currentGuild: { guildId: string }) => currentGuild.guildId === guild.id)
    );

    if (guildsToAdd.size === 0) {
      logger.info(
        "Discord Event Logger",
        "No new guilds to add to the database"
      );
      return;
    }

    logger.info("Discord - Guild Database", "Adding new guilds to database", {
      guildsToAdd: guildsToAdd.size,
    });

    for (const guild of guildsToAdd.values()) {
      try {
        await db.insert(guilds).values({ guildId: guild.id });

        logger.success(
          "Discord - Guild Database",
          "Created guild in database",
          {
            guildId: guild.id,
            guildName: guild.name,
          }
        );

        posthog.capture({
          distinctId: guild.id,
          event: "guild joined",
          properties: {
            environment: env.NODE_ENV,
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
    }
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
  await db.insert(guilds).values({ guildId }).onConflictDoNothing({ target: guilds.guildId });
  return true;
}
