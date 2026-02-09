import type { Queue } from "bullmq";

import { Worker, Job } from "bullmq";

import client from "../bot.js";
import redisClient from "../redis/index.js";
import env from "../utils/env.js";
import logger from "../utils/logger.js";
import { cronToText } from "../utils/cronParser.js";

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

  queue.add(
    "send-motivation",
    {},
    {
      repeat: {
        pattern:
          process.env["DISCORD_DEFAULT_MOTIVATIONAL_DAILY_TIME"] || "0 8 * * *", // Default to every day at 8:00 AM
        tz: "America/Chicago", // CST timezone
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  logger.info("Worker", "Jobs registered", {
    activityInterval: `${env.DISCORD_ACTIVITY_INTERVAL_MINUTES}m`,
    motivationCron: cronToText(env.DISCORD_DEFAULT_MOTIVATIONAL_DAILY_TIME || "0 8 * * *"),
  });
};
