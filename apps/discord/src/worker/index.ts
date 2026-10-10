import { Worker, Job } from "bullmq";
import type { Queue } from "bullmq";
import type { Client } from "discord.js";

import { bullRedis } from "../redis/index.js";
import env from "../utils/env.js";
import logger from "../utils/logger.js";
import { withTimeout } from "../utils/async.js";
import { createThrottledErrorLogger } from "../utils/throttledErrorLogger.js";

import setActivity from "./jobs/setActivity.js";
import sendMotivation from "./jobs/sendMotivation.js";

/** The single definition of the queue name; bot.ts builds the Queue from it. */
export const QUEUE_NAME = "fluffboost-jobs";

/** How often shard 0 re-asserts the job schedulers (repairs a broken repeat chain or lost keys). */
export const SCHEDULE_REFRESH_MS = 5 * 60_000;

/** Startup waits this long for scheduling; BullMQ's connection queues commands while Redis is down. */
const SCHEDULE_STARTUP_TIMEOUT_MS = 30_000;

/**
 * Upper bounds on a single run. A timed-out run fails (freeing its concurrency
 * slot) and its abort signal fires, so send-motivation stops claiming guilds;
 * the next scheduled tick picks up whatever was left.
 */
type JobName = "set-activity" | "send-motivation";

export const JOB_TIMEOUTS_MS = {
  "set-activity": 60_000,
  "send-motivation": 10 * 60_000,
} as const satisfies Record<JobName, number>;

const JOB_TEMPLATE_OPTS = {
  removeOnComplete: { count: 50 },
  removeOnFail: { count: 100 },
};

function schedules(): { name: JobName; every: number }[] {
  return [
    { name: "set-activity", every: env.DISCORD_ACTIVITY_INTERVAL_MINUTES * 60 * 1000 },
    { name: "send-motivation", every: 60 * 1000 },
  ];
}

/**
 * Removes repeatables created by the legacy `queue.add(name, data, { repeat })`
 * API, which share the `repeat` set with job schedulers but are keyed by a
 * hash instead of the scheduler id. Left in place they would run alongside the
 * new schedulers.
 */
async function removeLegacyRepeatables(queue: Queue, names: Set<string>): Promise<void> {
  // Deprecated APIs on purpose: they are the only way to address legacy keys.
  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    if (names.has(job.name) && job.key !== job.name) {
      await queue.removeRepeatableByKey(job.key);
    }
  }
}

/**
 * Idempotent: upsertJobScheduler keeps an existing scheduler's next run when
 * its interval is unchanged and recreates a missing delayed job.
 */
async function ensureSchedules(queue: Queue): Promise<void> {
  for (const { name, every } of schedules()) {
    await queue.upsertJobScheduler(name, { every }, { name, data: {}, opts: JOB_TEMPLATE_OPTS });
  }
}

/** Runs a processor with a deadline; aborts `controller` on timeout. */
async function runWithDeadline<T>(
  name: JobName,
  controller: AbortController,
  run: () => Promise<T>
): Promise<T> {
  return withTimeout(run(), JOB_TIMEOUTS_MS[name], `Job "${name}"`, (err) => controller.abort(err));
}

export default async function startWorker(queue: Queue, client: Client): Promise<Worker> {
  const worker = new Worker(
    queue.name,
    async (job: Job, _token?: string, signal?: AbortSignal) => {
      // Aborted by worker.cancelAllJobs() (shutdown) or by the job deadline.
      const controller = new AbortController();
      if (signal?.aborted) {
        controller.abort(signal.reason);
      } else {
        signal?.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
      }

      switch (job.name) {
        case "set-activity":
          return runWithDeadline("set-activity", controller, () => setActivity(client));
        case "send-motivation":
          return runWithDeadline("send-motivation", controller, () => sendMotivation(client, controller.signal));
        default:
          throw new Error(`No job found with name ${job.name}`);
      }
    },
    {
      connection: bullRedis,
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    logger.success("Worker", `Job "${job.name}" completed (${job.id})`);
  });

  worker.on("failed", (job, err) => {
    logger.error("Worker", `Job "${job?.name}" failed (${job?.id}): ${err.message}`, err);
  });

  // Without a listener BullMQ falls back to console.error for every reconnect attempt.
  worker.on("error", createThrottledErrorLogger("Worker", "BullMQ worker error"));

  // Shard 0 owns queue scheduling; unsharded processes always register.
  const isScheduler = client.shard?.ids.includes(0) ?? true;
  if (!isScheduler) {
    logger.info("Worker", "Worker started (job schedulers owned by shard 0)", {
      concurrency: env.WORKER_CONCURRENCY,
    });
    return worker;
  }

  // Scheduling failures are retried by the refresh timer below rather than
  // failing startup: the Worker is already consuming and a restart would only
  // cost another gateway IDENTIFY.
  let legacyRemoved = false;
  const assertSchedules = async (): Promise<void> => {
    if (!legacyRemoved) {
      await removeLegacyRepeatables(queue, new Set(schedules().map((s) => s.name)));
      legacyRemoved = true;
    }
    await ensureSchedules(queue);
  };

  try {
    await withTimeout(assertSchedules(), SCHEDULE_STARTUP_TIMEOUT_MS, "Job scheduler registration");
    logger.info("Worker", "Job schedulers registered", {
      activityInterval: `${env.DISCORD_ACTIVITY_INTERVAL_MINUTES}m`,
      motivationCheck: "every 1m (per-guild schedule evaluation)",
      concurrency: env.WORKER_CONCURRENCY,
    });
  } catch (err) {
    logger.error("Worker", "Failed to register job schedulers; retrying on the refresh timer", err);
  }

  const refreshSchedules = async (): Promise<void> => {
    try {
      await assertSchedules();
    } catch (err) {
      logger.error("Worker", "Job scheduler refresh failed", err);
    }
  };
  const refresh = setInterval(() => void refreshSchedules(), SCHEDULE_REFRESH_MS);
  refresh.unref();
  worker.on("closing", () => clearInterval(refresh));

  return worker;
}
