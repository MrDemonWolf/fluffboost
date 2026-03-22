import { ShardingManager } from "discord.js";
import { config } from "dotenv";
import { queryClient } from "./database/index.js";
import api from "./api/index.js";
import redis from "./redis/index.js";
import env from "./utils/env.js";
import logger from "./utils/logger.js";

/**
 * Load environment variables from .env file.
 */
config();

/**
 * Verify database connectivity via a simple query.
 */
queryClient`SELECT 1`
  .then(() => {
    logger.database.connected("PostgreSQL");
  })
  .catch((err: Error) => {
    logger.database.error("PostgreSQL", err);
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
const manager = new ShardingManager("./src/bot.ts", {
  token: env.DISCORD_APPLICATION_BOT_TOKEN,
  totalShards: "auto",
});

manager.on("shardCreate", (shard) => {
  try {
    logger.discord.shardLaunched(shard.id);
  } catch (err: unknown) {
    logger.discord.shardError(shard.id, err);
  }
});

manager.spawn();
