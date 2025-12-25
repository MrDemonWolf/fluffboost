import { ShardingManager } from "discord.js";
import { config } from "dotenv";
import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import api from "./api/index.js";
import redis from "./redis/index.js";
import env from "./utils/env.js";
import logger from "./utils/logger.js";

/**
 * Load environment variables from .env file.
 */
config();

/**
 * Load Prsima Client and connect to Prisma Server if failed to connect, throw error.
 */
const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

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
redis
  .on("connect", () => {
    logger.database.connected("Redis");
  })
  .on("error", (err: Error) => {
    logger.database.error("Redis", err);
    process.exit(1);
  });

const server = api.listen(api.get("port"), () => {
  logger.api.started(api.get("host"), api.get("port"));
});

server.on("error", (err: unknown) => {
  logger.api.error(err);
  process.exit(1);
});

/**
 * Discord.js Sharding Manager
 */
const manager = new ShardingManager(
  env.NODE_ENV === "production" ? "./dist/bot.js" : "./src/bot.ts",
  env.NODE_ENV === "production"
    ? {
        token: env.DISCORD_APPLICATION_BOT_TOKEN,
        totalShards: "auto",
      }
    : {
        token: env.DISCORD_APPLICATION_BOT_TOKEN,
        totalShards: "auto",
        execArgv: ["--import", "tsx"],
      }
);

manager.on("shardCreate", (shard) => {
  try {
    logger.discord.shardLaunched(shard.id);
  } catch (err: unknown) {
    logger.discord.shardError(shard.id, err);
  }
});

manager.spawn();
