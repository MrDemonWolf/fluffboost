import { ShardingManager, fetchRecommendedShardCount } from "discord.js";
import { queryClient } from "./database/index.js";
import api from "./api/index.js";
import redis from "./redis/index.js";
import env from "./utils/env.js";
import logger from "./utils/logger.js";
import { runApp } from "./appCore.js";
import { hasAppSchema } from "./utils/startupChecks.js";
import { createThrottledErrorLogger } from "./utils/throttledErrorLogger.js";

/**
 * Manager-process entry point: wires the real dependencies into runApp()
 * (src/appCore.ts), which holds the startup sequence and shutdown logic.
 */
redis
  .on("ready", () => {
    logger.database.connected("Redis");
  })
  .on("end", () => {
    logger.warn("Database", "Redis connection closed");
  })
  // ioredis emits an error on every reconnect attempt during an outage; log one line per minute.
  .on("error", createThrottledErrorLogger("Database", "Redis error"));

await runApp({
  env,
  logger,
  probeDatabase: () => queryClient`SELECT 1`,
  hasAppSchema: () => hasAppSchema((text) => queryClient.unsafe(text)),
  closeDatabase: () => queryClient.end({ timeout: 5 }),
  redis,
  listen: (port, host) => (host ? api.listen(port, host) : api.listen(port)),
  fetchShardCount: () => fetchRecommendedShardCount(env.DISCORD_APPLICATION_BOT_TOKEN),
  createManager: (file, options) => new ShardingManager(file, options),
  proc: process,
});
