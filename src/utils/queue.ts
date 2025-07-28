import { Queue, Worker } from "bullmq";
import consola from "consola";

import redis from "../redis";

const messageQueue = new Queue("messageQueue", {
  connection: redis,
});
const messageWorker = new Worker(
  "messageQueue",
  async (job) => {
    // Process the job here
    consola.info({
      message: `[Discord Event Logger - Message Worker] Processing job ${
        job.id
      } with data: ${JSON.stringify(job.data)}`,
      badge: true,
      timestamp: new Date(),
    });
    // Simulate some processing time
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { success: true };
  },
  {
    connection: redis,
  }
);

export { messageQueue, messageWorker };
