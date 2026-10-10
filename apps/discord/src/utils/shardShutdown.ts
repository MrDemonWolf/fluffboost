import type { ChildProcess } from "node:child_process";

import { withTimeout } from "./async.js";

/**
 * Process-lifecycle policy shared by the manager (app.ts) and the shards (bot.ts).
 *
 * Stop budget, innermost first, so every layer finishes before the next one
 * gives up on it:
 *   shard watchdog (20 s) < shard SIGKILL (22 s) < parent watchdog (30 s)
 *   < orchestrator stop grace (35 s, docker-compose `stop_grace_period`).
 *
 * Fatal exits (login failure, unrecoverable gateway close, uncaught exception)
 * are delayed so a respawned shard cannot hot-loop IDENTIFY and burn Discord's
 * daily session-start budget; the manager escalates repeated shard deaths to a
 * container restart so the orchestrator's own backoff applies.
 */
export const SHARD_SHUTDOWN_WATCHDOG_MS = 20_000;
export const SHARD_KILL_TIMEOUT_MS = 22_000;
export const PARENT_SHUTDOWN_WATCHDOG_MS = 30_000;
export const FATAL_EXIT_DELAY_MS = 15_000;

/** Keep PID 1 alive until shard workers have finished their SIGTERM cleanup. */
export async function stopShardProcess(child: ChildProcess, timeoutMs = SHARD_KILL_TIMEOUT_MS): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {return;}
  await new Promise<void>((resolve) => {
    const finished = () => {
      clearTimeout(timer);
      child.removeListener("exit", finished);
      resolve();
    };
    child.once("exit", finished);
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      // Await the resulting exit rather than treating the signal as completion.
    }, timeoutMs);
    child.kill("SIGTERM");
  });
}

/** The parts of a discord.js Shard that teardown needs. */
export interface StoppableShard {
  process: ChildProcess | null;
  worker?: { terminate(): Promise<number> } | null;
}

function isRunning(shard: StoppableShard): boolean {
  if (shard.process) {
    return shard.process.exitCode === null && shard.process.signalCode === null;
  }
  return Boolean(shard.worker);
}

/**
 * Stops every shard, including one forked while teardown is under way.
 *
 * discord.js's Shard#_handleExit emits 'death' synchronously and only then
 * forks the replacement, and ShardingManager#spawn may still fork the next
 * shard after its inter-shard delay. Yielding first and re-reading the shard
 * list after each pass makes sure no freshly forked child is left behind as
 * an orphan that keeps its gateway session (and worker) alive.
 */
export async function stopAllShards(
  getShards: () => Iterable<StoppableShard>,
  { maxPasses = 5, stop = stopShardProcess }: { maxPasses?: number; stop?: (child: ChildProcess) => Promise<void> } = {}
): Promise<void> {
  for (let pass = 0; pass < maxPasses; pass++) {
    await new Promise<void>((resolve) => setImmediate(resolve));
    const running = [...getShards()].filter(isRunning);
    if (running.length === 0) {
      return;
    }
    await Promise.all(running.map((shard) =>
      shard.process ? stop(shard.process) : (shard.worker?.terminate() ?? Promise.resolve())
    ));
  }
}

interface ClosableRedis {
  status: string;
  quit(): Promise<string>;
  disconnect(): void;
}

/**
 * QUIT with a deadline. During an outage ioredis keeps QUIT in its offline
 * queue forever, so fall back to a hard disconnect. A lazy client that never
 * connected is just dropped (QUIT would open a connection first).
 */
export async function closeRedis(client: ClosableRedis, timeoutMs = 2_000): Promise<void> {
  if (client.status !== "wait" && client.status !== "end") {
    await withTimeout(client.quit(), timeoutMs, "redis quit").catch(() => undefined);
  }
  client.disconnect();
}

/**
 * Counts shard process deaths in a sliding window. discord.js respawns a dead
 * shard immediately; once a shard dies `maxDeaths` times within `windowMs` the
 * manager should give up and exit non-zero so the orchestrator restarts the
 * container with backoff (and recomputes the "auto" shard count).
 */
export function createCrashLoopDetector(options: { maxDeaths: number; windowMs: number; now?: () => number }) {
  const now = options.now ?? Date.now;
  const deaths = new Map<number, number[]>();
  return {
    /** Records a death; returns true once the shard is crash-looping. */
    recordDeath(shardId: number): boolean {
      const cutoff = now() - options.windowMs;
      const recent = (deaths.get(shardId) ?? []).filter((at) => at > cutoff);
      recent.push(now());
      deaths.set(shardId, recent);
      return recent.length >= options.maxDeaths;
    },
  };
}
