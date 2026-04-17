import { Worker, Job } from "bullmq";
import type { ConnectionOptions, Queue } from "bullmq";

import client from "../bot.js";
import redisClient from "../redis/index.js";
import env from "../utils/env.js";
import logger from "../utils/logger.js";

import setActivity from "./jobs/setActivity.js";
import sendMotivation from "./jobs/sendMotivation.js";

const QUEUE_NAME = "fluffboost-jobs";

async function ensureRepeatable(
  queue: Queue,
  name: string,
  data: unknown,
  intervalMs: number
): Promise<void> {
  // Drop any prior repeatables for this name so a changed interval doesn't
  // leave a stale schedule running alongside the new one.
  const existing = await queue.getRepeatableJobs();
  for (const job of existing) {
    if (job.name === name) {
      await queue.removeRepeatableByKey(job.key);
    }
  }

  await queue.add(name, data, {
    repeat: { every: intervalMs },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  });
}

export default async function startWorker(queue: Queue): Promise<Worker> {
  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      switch (job.name) {
        case "set-activity":
          return setActivity(client);
        case "send-motivation":
          return sendMotivation(client);
        default:
          throw new Error(`No job found with name ${job.name}`);
      }
    },
    {
      // ioredis instance type clashes with bullmq's bundled ioredis types,
      // but bullmq accepts the runtime instance directly.
      connection: redisClient as unknown as ConnectionOptions,
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on("completed", (job) => {
    logger.success("Worker", `Job "${job.name}" completed (${job.id})`);
  });

  worker.on("failed", (job, err) => {
    logger.error("Worker", `Job "${job?.name}" failed (${job?.id}): ${err.message}`, err);
  });

  await ensureRepeatable(
    queue,
    "set-activity",
    { client: null },
    env.DISCORD_ACTIVITY_INTERVAL_MINUTES * 60 * 1000
  );

  await ensureRepeatable(queue, "send-motivation", {}, 60 * 1000);

  logger.info("Worker", "Jobs registered", {
    activityInterval: `${env.DISCORD_ACTIVITY_INTERVAL_MINUTES}m`,
    motivationCheck: "every 1m (per-guild schedule evaluation)",
    concurrency: env.WORKER_CONCURRENCY,
  });

  return worker;
}
