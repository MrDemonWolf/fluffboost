import express from "express";

import { queryClient } from "../../database/index.js";
import redisClient from "../../redis/index.js";

const router: express.Router = express.Router();

const PROBE_TIMEOUT_MS = 1500;

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
  if (dbResult.status === "rejected") {
    body["dbError"] = (dbResult.reason as Error)?.message ?? String(dbResult.reason);
  }
  if (redisResult.status === "rejected") {
    body["redisError"] = (redisResult.reason as Error)?.message ?? String(redisResult.reason);
  }

  res.status(status === "ok" ? 200 : 503).json(body);
});

export default router;
