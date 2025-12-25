import { ShardingManager } from "discord.js";
import { config } from "dotenv";
import { PrismaClient } from "./generated/prisma/client.js";

import api from "./api";
import redisClient from "./redis";
import env from "./utils/env";
import logger from "./utils/logger";

/**
 * Load environment variables from .env file.
 */
config();

/**
 * Load Prsima Client and connect to Prisma Server if failed to connect, throw error.
 */
const prisma = new PrismaClient();

prisma
  .$connect()
  .then(async () => {
    await prisma.$disconnect();
    logger.database.connected("Prisma");
  })
  .catch(async (err: Error) => {
    logger.database.error("Prisma", err);
    process.exit(1);
  });

/**
 * Load Redis connection and connect to Redis Server if failed to connect, throw error.
 */
redisClient
  .on("connect", () => {
    logger.database.connected("Redis");
  })
  .on("error", (err: Error) => {
    logger.database.error("Redis", err);
    process.exit(1);
  });

/**
 * Start API server.
 */

api.listen(api.get("port"), () => {
  logger.api.started(api.get("host"), api.get("port"));
});

api.on("error", (err: unknown) => {
  logger.api.error(err);
  process.exit(1);
});

/**
 * Discord.js Sharding Manager
 */
const manager = new ShardingManager("./src/bot.ts", {
  token: env.DISCORD_APPLICATION_BOT_TOKEN,
  execArgv: ["-r", "ts-node/register"],
});

manager.on("shardCreate", (shard) => {
  try {
    logger.discord.shardLaunched(shard.id);
  } catch (err: unknown) {
    logger.discord.shardError(shard.id, err);
  }
});

manager.spawn();
