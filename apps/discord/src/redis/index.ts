import { Redis } from "ioredis";
import type { ConnectionOptions } from "bullmq";

import env from "../utils/env.js";

const redisClient = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

// ioredis instance type clashes with bullmq's bundled ioredis types,
// but bullmq accepts the runtime instance directly.
export const bullConnection = redisClient as unknown as ConnectionOptions;

export default redisClient;
