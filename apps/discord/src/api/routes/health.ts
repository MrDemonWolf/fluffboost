import express from "express";

import { queryClient } from "../../database/index.js";
import redisClient from "../../redis/index.js";
import env from "../../utils/env.js";
import logger from "../../utils/logger.js";
import { withTimeout } from "../../utils/async.js";

const router: express.Router = express.Router();

const PROBE_TIMEOUT_MS = 1500;

type ProbeStatus = "ok" | "error";

interface ProbeResult {
  status: ProbeStatus;
  /** Driver error message; only surfaced outside production. */
  error?: string;
}

interface HealthBody {
  status: "ok" | "degraded";
  db: ProbeStatus;
  redis: ProbeStatus;
  dbError?: string;
  redisError?: string;
}

/**
 * Runs one dependency probe under a deadline and logs a failure.
 *
 * Note: on timeout the underlying Postgres probe keeps running until the driver
 * gives up (postgres-js `connect_timeout`); the Redis client fails fast on its
 * own (no offline queue, command timeout). Readiness is expected to be polled
 * infrequently (uptime monitors), so a backed-up probe is tolerable.
 */
async function probe<T>(name: "db" | "redis", check: PromiseLike<T>): Promise<ProbeResult> {
  try {
    await withTimeout(check, PROBE_TIMEOUT_MS, name);
    return { status: "ok" };
  } catch (err) {
    logger.error("API", `Health probe failed (${name})`, err);
    return { status: "error", error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Liveness: the process and its event loop answer. Dependency-free on purpose,
 * because this backs the container HEALTHCHECK: a Postgres/Redis blip must not
 * get a bot with live gateway sessions killed (both clients reconnect on their
 * own). Registered before "/" so it never runs the probes.
 */
router.get("/live", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * Readiness: Postgres and Redis reachability, for external uptime monitoring
 * and alerting. 503 when either probe fails.
 */
router.get("/", async (_req, res) => {
  const [db, redis] = await Promise.all([
    probe("db", queryClient`SELECT 1`),
    probe("redis", redisClient.ping()),
  ]);
  const status = db.status === "ok" && redis.status === "ok" ? "ok" : "degraded";
  const body: HealthBody = { status, db: db.status, redis: redis.status };

  if (env.NODE_ENV !== "production") {
    body.dbError = db.error;
    body.redisError = redis.error;
  }

  res.status(status === "ok" ? 200 : 503).json(body);
});

export default router;
