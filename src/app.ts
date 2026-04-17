import { ShardingManager } from "discord.js";
import { config } from "dotenv";
import { queryClient } from "./database/index.js";
import api from "./api/index.js";
import redis from "./redis/index.js";
import env from "./utils/env.js";
import logger from "./utils/logger.js";

config();

let redisReady = false;

queryClient`SELECT 1`
  .then(() => {
    logger.database.connected("PostgreSQL");
  })
  .catch((err: Error) => {
    logger.database.error("PostgreSQL", err);
    process.exit(1);
  });

redis
  .on("ready", () => {
    redisReady = true;
    logger.database.connected("Redis");
  })
  .on("end", () => {
    logger.warn("Database", "Redis connection closed");
  })
  .on("error", (err: Error) => {
    // ioredis emits transient errors during reconnect attempts; only escalate
    // if we never managed to connect at all.
    if (!redisReady) {
      logger.database.error("Redis", err);
    } else {
      logger.warn("Database", `Redis transient error: ${err.message}`);
    }
  });

const server = api.listen(api.get("port"), () => {
  logger.api.started(api.get("host"), api.get("port"));
});

server.on("error", (err: unknown) => {
  logger.api.error(err);
  process.exit(1);
});

const manager = new ShardingManager("./src/bot.ts", {
  token: env.DISCORD_APPLICATION_BOT_TOKEN,
  totalShards: "auto",
  respawn: true,
});

manager.on("shardCreate", (shard) => {
  try {
    logger.discord.shardLaunched(shard.id);
  } catch (err: unknown) {
    logger.discord.shardError(shard.id, err);
  }
});

void manager.spawn();

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {return;}
  shuttingDown = true;
  logger.info("App", `Received ${signal}, shutting down gracefully`);

  // Stop accepting new HTTP work first.
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
    setTimeout(resolve, 5000).unref();
  });
  logger.info("App", "HTTP server closed");

  // Tell every shard to log out cleanly.
  try {
    await Promise.all(manager.shards.map((s) => s.kill()));
    logger.info("App", "Shards terminated");
  } catch (err) {
    logger.warn("App", "Error terminating shards", { error: err });
  }

  try {
    await queryClient.end({ timeout: 5 });
    logger.info("App", "Postgres pool closed");
  } catch (err) {
    logger.warn("App", "Error closing Postgres", { error: err });
  }

  try {
    redis.disconnect();
    logger.info("App", "Redis disconnected");
  } catch (err) {
    logger.warn("App", "Error disconnecting Redis", { error: err });
  }

  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
