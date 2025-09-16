import Redis from "ioredis";

import env from "../utils/env";

const redisClient = new Redis(env.REDIS_URL || "redis://localhost:6379/0", {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

export default redisClient;
