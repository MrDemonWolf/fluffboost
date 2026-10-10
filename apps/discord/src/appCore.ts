import type { Server } from "node:http";
import type { ShardingManager } from "discord.js";
import type logger from "./utils/logger.js";
import { retryWithBackoff, sleep, withTimeout } from "./utils/async.js";
import {
  FATAL_EXIT_DELAY_MS,
  PARENT_SHUTDOWN_WATCHDOG_MS,
  closeRedis,
  createCrashLoopDetector,
  stopAllShards,
} from "./utils/shardShutdown.js";
import type { StoppableShard } from "./utils/shardShutdown.js";
import { SCHEMA_MISSING_MESSAGE, probeRedis, resolveShardCount } from "./utils/startupChecks.js";
import type { RedisProbeClient } from "./utils/startupChecks.js";

/** Startup dependency check: 7 attempts, 1+2+4+8+15+15 s ≈ 45 s of capped backoff before giving up. */
const DEPENDENCY_CHECK_ATTEMPTS = 7;
const DEPENDENCY_PROBE_TIMEOUT_MS = 3_000;

/** Recommended shard count lookup: bounded retries for network errors, 5xx and 429. */
const SHARD_COUNT_ATTEMPTS = 5;
const SHARD_COUNT_TIMEOUT_MS = 10_000;

/** A shard that dies this often is crash-looping; let the orchestrator restart with backoff. */
const SHARD_CRASH_LOOP = { maxDeaths: 5, windowMs: 15 * 60_000 };

/** The parts of a discord.js ShardingManager the manager process uses. */
export type ManagerLike = Pick<ShardingManager, "on" | "spawn"> & {
  respawn: boolean;
  shards: { values(): Iterable<StoppableShard> };
};

/** The parts of the shared ioredis client the manager process uses. */
export type ManagerRedis = RedisProbeClient & { status: string; quit(): Promise<string>; disconnect(): void };

/** The process hooks app.ts registers; injectable so tests never touch the real process. */
export interface ProcessLike {
  on(event: "SIGTERM" | "SIGINT", listener: () => void): unknown;
  on(event: "unhandledRejection", listener: (reason: unknown) => void): unknown;
  on(event: "uncaughtException", listener: (err: Error) => void): unknown;
  exit(code: number): void;
}

export interface AppDeps {
  env: { HOST?: string | undefined; PORT: number; DISCORD_APPLICATION_BOT_TOKEN: string };
  logger: typeof logger;
  /** `SELECT 1` against Postgres. */
  probeDatabase: () => Promise<unknown>;
  /** True when the app schema (public."Guild") exists. */
  hasAppSchema: () => Promise<boolean>;
  closeDatabase: () => Promise<void>;
  redis: ManagerRedis;
  listen: (port: number, host?: string) => Server;
  fetchShardCount: () => Promise<number>;
  createManager: (file: string, options: { token: string; totalShards: number; respawn: boolean }) => ManagerLike;
  proc: ProcessLike;
  /** Backoff base for the dependency check; tests shorten it. */
  dependencyRetryBaseMs?: number;
}

export interface AppHandle {
  server: Server;
  manager: ManagerLike;
  shutdown: (reason: string, exitCode?: number, minExitDelayMs?: number) => Promise<void>;
}

/**
 * The manager process: verify Postgres, Redis and the schema, start the API,
 * resolve the shard count, then spawn shards. Resolves once the manager
 * exists, or `null` after a fatal startup error (the process is exiting).
 */
export async function runApp(deps: AppDeps): Promise<AppHandle | null> {
  const { env, logger, proc, redis } = deps;
  let shuttingDown = false;
  /** Set once the server and manager exist, i.e. once shutdown() has something to tear down. */
  let started = false;
  let shutdown: AppHandle["shutdown"] | null = null;

  proc.on("unhandledRejection", (reason) => {
    logger.error("App", "Unhandled promise rejection", reason);
  });
  proc.on("uncaughtException", (err) => {
    logger.error("App", "Uncaught exception", err);
    if (!started || !shutdown) {
      proc.exit(1);
      return;
    }
    void shutdown("uncaughtException", 1);
  });

  /**
   * Verify Postgres and Redis before spawning shards: each shard spends a
   * gateway IDENTIFY, so don't start them against dependencies that are down.
   */
  try {
    await retryWithBackoff(
      () => Promise.all([
        withTimeout(deps.probeDatabase(), DEPENDENCY_PROBE_TIMEOUT_MS, "PostgreSQL"),
        probeRedis(redis, DEPENDENCY_PROBE_TIMEOUT_MS),
      ]),
      {
        attempts: DEPENDENCY_CHECK_ATTEMPTS,
        baseMs: deps.dependencyRetryBaseMs ?? 1_000,
        maxMs: 15_000,
        onRetry: (err, attempt, delayMs) => {
          logger.warn("App", "Dependencies not reachable yet; retrying", {
            attempt,
            delayMs,
            error: err.message,
          });
        },
      }
    );
    logger.database.connected("PostgreSQL");
  } catch (err) {
    logger.error("App", "PostgreSQL/Redis unreachable; giving up", err);
    proc.exit(1);
    return null;
  }

  // Reachable but unmigrated (SKIP_MIGRATIONS=true on an empty database): every
  // query would fail at runtime, so refuse to start. Retrying would not help.
  try {
    if (!(await deps.hasAppSchema())) {
      logger.error("App", SCHEMA_MISSING_MESSAGE);
      proc.exit(1);
      return null;
    }
  } catch (err) {
    logger.error("App", "Could not check the database schema; giving up", err);
    proc.exit(1);
    return null;
  }

  // Without HOST, listen on all interfaces (dual-stack), which containers need.
  const server = env.HOST ? deps.listen(env.PORT, env.HOST) : deps.listen(env.PORT);

  // Logged only once the bind succeeded; a bind failure goes to the "error" handler below.
  // listen(PORT, HOST) binds exactly HOST; without HOST, Node binds the unspecified address.
  server.once("listening", () => {
    const address = server.address();
    if (address && typeof address === "object") {
      logger.api.started(address.address, address.port);
    } else {
      logger.api.started(env.HOST ?? "::", env.PORT);
    }
  });

  server.on("error", (err: Error) => {
    logger.api.error(err);
    proc.exit(1);
  });

  /**
   * Resolved here rather than with totalShards: "auto", whose single bare fetch
   * (no timeout, no retry) would exit the process on one transient Discord 5xx.
   * An invalid token, or retries running out, exits after FATAL_EXIT_DELAY_MS so
   * an orchestrator restart cannot hot-loop Discord.
   */
  let totalShards: number;
  try {
    totalShards = await resolveShardCount(deps.fetchShardCount, {
      attempts: SHARD_COUNT_ATTEMPTS,
      baseMs: 1_000,
      maxMs: 15_000,
      timeoutMs: SHARD_COUNT_TIMEOUT_MS,
      onRetry: (err, attempt, delayMs) => {
        logger.warn("App", "Could not fetch the recommended shard count; retrying", {
          attempt,
          delayMs,
          error: err.message,
        });
      },
    });
  } catch (err) {
    logger.error("App", "Cannot resolve the shard count; exiting", err);
    logger.warn("App", `Exiting in ${FATAL_EXIT_DELAY_MS / 1000}s`);
    server.close();
    await sleep(FATAL_EXIT_DELAY_MS);
    proc.exit(1);
    return null;
  }

  const manager = deps.createManager("./src/bot.ts", {
    token: env.DISCORD_APPLICATION_BOT_TOKEN,
    totalShards,
    respawn: true,
  });

  /**
   * Stop budget (see shardShutdown.ts): HTTP close and shard drain run
   * concurrently, and the whole teardown is capped below the orchestrator's
   * 35 s stop grace.
   */
  const doShutdown = async (reason: string, exitCode = 0, minExitDelayMs = 0): Promise<void> => {
    if (shuttingDown) {return;}
    shuttingDown = true;
    const startedAt = Date.now();
    logger.info("App", `${reason}: shutting down gracefully`);

    // A delayed fatal exit gets its delay on top (nothing external is waiting on it).
    setTimeout(() => {
      logger.error("App", "Shutdown watchdog fired; forcing exit");
      proc.exit(1);
    }, PARENT_SHUTDOWN_WATCHDOG_MS + minExitDelayMs).unref();

    // Stop respawning before killing so a crashed shard doesn't re-spawn mid-teardown.
    manager.respawn = false;

    const closeServer = new Promise<void>((resolve) => {
      server.close(() => resolve());
      setTimeout(resolve, 5000).unref();
    }).then(() => logger.info("App", "HTTP server closed"));

    const stopShards = (async () => {
      try {
        await stopAllShards(() => manager.shards.values());
        logger.info("App", "Shards terminated");
      } catch (err) {
        logger.warn("App", "Error terminating shards", { error: String(err) });
      }
    })();

    await Promise.all([closeServer, stopShards]);

    try {
      await deps.closeDatabase();
      logger.info("App", "Postgres pool closed");
    } catch (err) {
      logger.warn("App", "Error closing Postgres", { error: String(err) });
    }

    await closeRedis(redis);
    logger.info("App", "Redis disconnected");

    const remaining = minExitDelayMs - (Date.now() - startedAt);
    if (remaining > 0) {
      await sleep(remaining);
    }
    proc.exit(exitCode);
  };
  shutdown = doShutdown;

  const crashLoop = createCrashLoopDetector(SHARD_CRASH_LOOP);
  started = true;

  manager.on("shardCreate", (shard) => {
    logger.discord.shardLaunched(shard.id);

    // A failed respawn emits 'error'; without a listener it would crash the
    // manager and every healthy shard with it.
    shard.on("error", (err) => {
      logger.discord.shardError(shard.id, err);
    });

    shard.on("death", (child) => {
      if (shuttingDown) {
        return;
      }
      const exitCode = "exitCode" in child ? child.exitCode : null;
      logger.error("App", `Shard ${shard.id} exited`, undefined, { shardId: shard.id, exitCode });
      if (crashLoop.recordDeath(shard.id)) {
        logger.error("App", `Shard ${shard.id} is crash-looping; restarting the whole process`, undefined, {
          shardId: shard.id,
          ...SHARD_CRASH_LOOP,
        });
        // Deferred: discord.js forks the replacement only after the 'death'
        // listeners return, and that new child must be stopped too.
        setImmediate(() => void doShutdown("shard crash loop", 1));
      }
    });

    shard.on("ready", () => {
      logger.info("App", `Shard ${shard.id} ready`, { shardId: shard.id });
    });
  });

  manager.spawn().catch((err: unknown) => {
    if (shuttingDown) {
      return;
    }
    logger.error("App", "Failed to spawn shards", err);
    // Delayed like a shard's fatal exit, so a restart cannot hot-loop IDENTIFY.
    void doShutdown("spawn failure", 1, FATAL_EXIT_DELAY_MS);
  });

  proc.on("SIGTERM", () => void doShutdown("Received SIGTERM"));
  proc.on("SIGINT", () => void doShutdown("Received SIGINT"));

  return { server, manager, shutdown: doShutdown };
}
