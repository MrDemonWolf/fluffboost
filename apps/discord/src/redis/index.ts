import { Redis } from "ioredis";

import env from "../utils/env.js";

/**
 * Interactive client (rate limiters, health probe). Fails fast during an
 * outage instead of parking commands in the offline queue, so a slash command
 * errors within Discord's response window rather than running late.
 */
const redisClient = new Redis(env.REDIS_URL, {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  commandTimeout: 2_000,
  enableReadyCheck: true,
});

/**
 * Dedicated BullMQ connection. BullMQ requires `maxRetriesPerRequest: null`
 * (blocking commands must wait out reconnects). Lazy so processes that never
 * build a Queue/Worker (the shard manager) don't open it. Passed uncast as the
 * Queue/Worker `connection`, so tsc flags any ioredis skew with BullMQ.
 */
export const bullRedis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: true,
});

export default redisClient;
