import { ShardingManager } from "discord.js";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import consola from "consola";

import api from "./api";

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
      message: `Prisma: Connected`,
      badge: true,
    });

    /**
     * Start Express API Server
     */
    api.listen(api.get("port"), () => {
      /**
       *  Log infomation after everything is started.
       */
      if (process.env.NODE_ENV !== "test") {
        consola.success({
          message: `API: Listening at http://${api.get("host")}:${api.get(
            "port"
          )}`,
          badge: true,
        });
      }
    });
  })
  .catch(async (err: any) => {
    consola.error({
      message: `Prisma: Error connecting to database: ${err}`,
      badge: true,
    });
    process.exit(1);
  });

/**
 * Discord.js Sharding Manager
 */
const manager = new ShardingManager("./src/bot.ts", {
  token: process.env.DISCORD_APPLICATION_BOT_TOKEN,
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
