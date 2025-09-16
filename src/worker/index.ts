import type { Queue } from "bullmq";

import { Worker, Job } from "bullmq";

import client from "../bot";
import redisClient from "../redis";
import logger from "../utils/logger";
import { cronToText } from "../utils/cronParser";

/**
 * Import worker jobs
 */
import setActivity from "./jobs/setActivity";
import sendMotivation from "./jobs/sendMotivation";

const worker = new Worker(
  "fluffboost-jobs",
  async (job: Job) => {
    switch (job.name) {
      case "set-activity":
        return setActivity(client);
      case "send-motivation":
        return sendMotivation();
      default:
        throw new Error(`No job found with name ${job.name}`);
    }
  },
  {
    connection: redisClient,
  }
);

worker.on("completed", (job) => {
  logger.success("Worker", `Job ${job.id} of type ${job.name} has completed`);
});

worker.on("failed", (job, err) => {
  logger.error(
    "Worker",
    `Job ${job?.id} of type ${job?.name} has failed with error ${err.message}`,
    err
  );
});

export default (queue: Queue) => {
  // Add jobs to the queue
  queue.add(
    "set-activity",
    { client: null }, // client will be set in the job processor
    {
      repeat: {
        every:
          (Number(process.env.DISCORD_ACTIVITY_INTERVAL_MINUTES) || 15) *
          60 *
          1000, // Default to every 15 minutes
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
          process.env.DISCORD_DEFAULT_MOTIVATIONAL_DAILY_TIME || "0 8 * * *", // Default to every day at 8:00 AM
        tz: "America/Chicago", // CST timezone
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  logger.info("Worker", "Jobs have been added to the queue", {
    activityCron: `Every ${
      Number(process.env.DISCORD_ACTIVITY_INTERVAL_MINUTES) || 15
    } minutes`,
    motivationCron: cronToText(
      process.env.DISCORD_DEFAULT_MOTIVATIONAL_DAILY_TIME || "0 8 * * *"
    ),
  });
};
