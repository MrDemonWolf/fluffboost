import type { Queue } from "bullmq";

import { Worker, Job } from "bullmq";

import client from "../bot.js";
import redisClient from "../redis/index.js";
import env from "../utils/env.js";
import logger from "../utils/logger.js";

/**
 * Import worker jobs
 */
import setActivity from "./jobs/setActivity.js";
import sendMotivation from "./jobs/sendMotivation.js";

const worker = new Worker(
  "fluffboost-jobs",
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
    connection: redisClient,
  }
);

worker.on("completed", (job) => {
  logger.success("Worker", `Job "${job.name}" completed (${job.id})`);
});

worker.on("failed", (job, err) => {
  logger.error("Worker", `Job "${job?.name}" failed (${job?.id}): ${err.message}`, err);
});

export default (queue: Queue) => {
  // Add jobs to the queue
  queue.add(
    "set-activity",
    { client: null }, // client will be set in the job processor
    {
      repeat: {
        every: env.DISCORD_ACTIVITY_INTERVAL_MINUTES * 60 * 1000, // minutes to ms
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  // Run every minute to evaluate per-guild schedules
  queue.add(
    "send-motivation",
    {},
    {
      repeat: {
        every: 60 * 1000, // every minute
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  logger.info("Worker", "Jobs registered", {
    activityInterval: `${env.DISCORD_ACTIVITY_INTERVAL_MINUTES}m`,
    motivationCheck: "every 1m (per-guild schedule evaluation)",
  });
};
