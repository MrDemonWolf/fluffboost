import express from "express";

import { queryClient } from "../../database/index.js";
import redisClient from "../../redis/index.js";
import env from "../../utils/env.js";
import logger from "../../utils/logger.js";

const router: express.Router = express.Router();

const PROBE_TIMEOUT_MS = 1500;

/**
 * Note: on timeout the underlying probe query keeps running until the driver
 * gives up (postgres-js `connect_timeout: 10`, ioredis default command behavior).
 * The health endpoint is expected to be called infrequently (Coolify/k8s probe
 * cadence, seconds-apart), so a backed-up probe is tolerable. If this endpoint
 * ever moves to high-QPS monitoring, switch to `postgres().cancel()` on the
 * pending query and a dedicated ioredis connection with command timeout.
 */
function withTimeout<T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

router.get("/", async (_req, res) => {
  const [dbResult, redisResult] = await Promise.allSettled([
    withTimeout(queryClient`SELECT 1`, PROBE_TIMEOUT_MS, "db"),
    withTimeout(redisClient.ping(), PROBE_TIMEOUT_MS, "redis"),
  ]);

  const db = dbResult.status === "fulfilled" ? "ok" : "error";
  const redis = redisResult.status === "fulfilled" ? "ok" : "error";
  const status = db === "ok" && redis === "ok" ? "ok" : "degraded";

  const body: Record<string, unknown> = { status, db, redis };
  const includeDetails = env.NODE_ENV !== "production";

  if (dbResult.status === "rejected") {
    logger.error("API", "Health probe failed (db)", dbResult.reason);
    if (includeDetails) {
      body["dbError"] = (dbResult.reason as Error)?.message ?? String(dbResult.reason);
    }
  }
  if (redisResult.status === "rejected") {
    logger.error("API", "Health probe failed (redis)", redisResult.reason);
    if (includeDetails) {
      body["redisError"] = (redisResult.reason as Error)?.message ?? String(redisResult.reason);
    }
  }

  res.status(status === "ok" ? 200 : 503).json(body);
});

export default router;
