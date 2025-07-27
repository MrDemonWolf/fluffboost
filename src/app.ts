import { ShardingManager } from "discord.js";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import consola from "consola";

import api from "./api";
import redisClient from "./redis";
import env from "./utils/env";

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
    consola.success({
      message: `[Prisma] Connected`,
      badge: true,
    });
  })
  .catch(async (err: any) => {
    consola.error({
      message: `[Prisma] Error connecting to database: ${err}`,
      badge: true,
    });
    process.exit(1);
  });

/**
 * Load Redis connection and connect to Redis Server if failed to connect, throw error.
 */
redisClient
  .on("connect", () => {
    consola.success({
      message: `[Redis] Connected`,
      badge: true,
    });
  })
  .on("error", (err: any) => {
    consola.error({
      message: `[Redis] Error connecting to Redis: ${err}`,
      badge: true,
    });
    process.exit(1);
  });

/**
 * Start API server.
 */

api.listen(api.get("port"), () => {
  consola.ready({
    message: `[API] Listening on http://${api.get("host")}:${api.get("port")}`,
    badge: true,
    timestamp: new Date(),
    level: "info",
  });
});

api.on("error", (err) => {
  consola.error({
    message: `[API] ${err}`,
    badge: true,
    timestamp: new Date(),
    level: "error",
  });
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
    consola.success({
      message: `Launched shard ${shard.id}`,
      badge: true,
    });
  } catch (err) {
    consola.error({
      message: `Error launching shard ${shard.id}: ${err}`,
      badge: true,
    });
  }
});

manager.spawn();
