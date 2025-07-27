import Redis from "ioredis";

import env from "../utils/env";

const redisClient = new Redis(env.REDIS_URL || "redis://localhost:6379/0");

// Avoid process exits on connection issues and surface useful diagnostics
redisClient.on("error", (err) => {
  // eslint-disable-next-line no-console
  console.error("[redis] connection error:", err);
});
redisClient.on("connect", () => {
  // eslint-disable-next-line no-console
  console.info("[redis] connected");
});

export default redisClient;
