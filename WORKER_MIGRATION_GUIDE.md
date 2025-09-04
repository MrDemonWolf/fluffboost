# BullMQ Worker Migration Guide

**Prerequisites**: Complete the Queue Migration Guide first and verify queues are working correctly.

This guide focuses on migrating your job processing logic to BullMQ workers that process jobs from the queues you set up. This follows all the rules established:

## Migration Strategy Explained

This is **Phase 2** of your complete migration from cron to BullMQ. You're not running two systems - you're completing the replacement.

### **What We're NOT Doing:**

- ❌ Running both old job processing AND BullMQ workers
- ❌ Keeping any cron-related code around
- ❌ Having backup systems running in parallel

### **What We ARE Doing:**

- ✅ **Complete the migration** started in Phase 1
- ✅ **Replace direct job execution** with BullMQ worker processing
- ✅ **Remove all cron dependencies** completely

### **After Phase 1 → After Phase 2:**

```
PHASE 1 RESULT (Queue Migration Complete):
BullMQ scheduler → Adds jobs to queues → Still runs sendMotivation() and setActivity() directly

PHASE 2 RESULT (Worker Migration Complete):
BullMQ scheduler → Adds jobs to queues → BullMQ workers process jobs
```

### **Final Result:**

- ✅ **No cron code remaining**
- ✅ **Pure BullMQ system**
- ✅ **Better reliability, retry handling, and monitoring**

## What Happens in This Phase

In Phase 2, you'll **completely replace** how jobs are processed - from direct execution to BullMQ workers:

### **Before This Guide (After Phase 1):**

```typescript
// Jobs are added to queues by schedulers
await motivationQueue.add("send-motivation", { guildId: "guild123" });

// But jobs are still processed by directly calling your functions
// (This happens when jobs are added - immediate processing)
await sendMotivation(guildId); // Still called directly
```

### **After This Guide (Complete BullMQ):**

```typescript
// Jobs are added to queues by schedulers (same as Phase 1)
await motivationQueue.add("send-motivation", { guildId: "guild123" });

// But now BullMQ workers process the jobs from the queue
// Worker picks up job from queue → calls your function
const worker = new Worker("motivation", async (job) => {
  await sendMotivation(job.data.guildId); // Called by worker
});
```

**Key Benefits**: Jobs survive server restarts, automatic retries, better error handling, and you can scale workers independently.

- ✅ **Function-based approach** (no classes)
- ✅ **No temporary feature flags** (eliminates ephemeral runtime toggles while retaining necessary environment configuration like Redis URLs, concurrency settings, and backoff parameters)
- ✅ **Separate queues and workers** into different folders
- ✅ **Per-server scheduling** for motivation messages
- ✅ **Clean file organization** with dedicated folders

## Overview

In this second phase, we'll:

- Create BullMQ workers to process jobs from your queues
- Replace your current job processing logic with queue-based processing
- Test worker functionality thoroughly
- Complete the migration from cron to BullMQ

## Project Structure After This Migration

```
src/
├── queues/                    # ✅ Queue definitions (from previous guide)
│   ├── index.ts              # Main queue exports
│   ├── motivationQueue.ts    # Motivation queue config
│   └── activityQueue.ts      # Activity queue config
├── worker/                   # ✅ Worker processing (this guide)
│   ├── index.ts             # Main worker startup
│   ├── workers/             # Individual worker processors
│   │   ├── index.ts
│   │   ├── workerUtils.ts
│   │   ├── motivationWorker.ts
│   │   └── activityWorker.ts
│   └── jobs/                # ✅ Job processing logic (updated)
│       ├── sendMotivation.ts
│       └── setActivity.ts
└── schedulers/              # ✅ Job scheduling logic (from previous guide)
    ├── index.ts
    └── motivationScheduler.ts
```

## Step 1: Create Worker Structure

### Create Worker Directory

```bash
mkdir -p src/worker/workers
```

### Create Worker Utilities

Create `src/worker/workers/workerUtils.ts`:

```typescript
import { Worker } from "bullmq";
import redisClient from "../../redis";
import logger from "../../utils/logger";

export const createWorker = (
  queueName: string,
  processor: (job: any) => Promise<void>,
  options: {
    concurrency?: number;
  } = {}
) => {
  const worker = new Worker(queueName, processor, {
    connection: redisClient,
    concurrency: options.concurrency || 1,
  });

  // Common event handlers
  worker.on("completed", (job) => {
    logger.info(`${queueName} job completed: ${job.id}`);
  });

  worker.on("failed", (job, err) => {
    logger.error(`${queueName} job failed: ${job?.id}`, err);
  });

  worker.on("error", (err) => {
    logger.error(`${queueName} worker error:`, err);
  });

  worker.on("stalled", (jobId) => {
    logger.warn(`${queueName} job stalled: ${jobId}`);
  });

  return worker;
};
```

**Note**: Retry configuration (attempts, backoff, removeOnComplete, removeOnFail) should be configured on the Queue via `defaultJobOptions` when creating the queue, not on the Worker. Workers only handle processing and concurrency settings.

## Step 2: Create Individual Workers

### Activity Worker

Create `src/worker/workers/activityWorker.ts`:

```typescript
import { Job } from "bullmq";
import { createWorker } from "./workerUtils";
import { setActivity } from "../jobs/setActivity";
import logger from "../../utils/logger";

const processActivityJob = async (job: Job) => {
  logger.info(`Processing activity job: ${job.id}`);

  try {
    await setActivity();
    logger.info(`Activity job ${job.id} completed successfully`);
  } catch (error) {
    logger.error(`Activity job ${job.id} failed:`, error);
    throw error; // This will trigger BullMQ's retry mechanism
  }
};

export const createActivityWorker = () => {
  return createWorker("activity", processActivityJob, {
    concurrency: 1, // Process one activity job at a time
  });
};
```

### Motivation Worker

Create `src/worker/workers/motivationWorker.ts`:

```typescript
import { Job } from "bullmq";
import { createWorker } from "./workerUtils";
import { sendMotivation } from "../jobs/sendMotivation";
import logger from "../../utils/logger";

const processMotivationJob = async (job: Job) => {
  logger.info(`Processing motivation job: ${job.id}`);

  try {
    const { guildId } = job.data;

    if (!guildId) {
      throw new Error("Guild ID is required for motivation job");
    }

    // Process single guild (per-server scheduling)
    await sendMotivation(guildId);
    logger.info(
      `Motivation job ${job.id} completed successfully for guild ${guildId}`
    );
  } catch (error) {
    logger.error(`Motivation job ${job.id} failed:`, error);
    throw error; // This will trigger BullMQ's retry mechanism
  }
};

export const createMotivationWorker = () => {
  return createWorker("motivation", processMotivationJob, {
    concurrency: 5, // Process up to 5 motivation jobs concurrently
  });
};
```

### Worker Manager

Create `src/worker/workers/index.ts`:

```typescript
import { createMotivationWorker } from "./motivationWorker";
import { createActivityWorker } from "./activityWorker";
import logger from "../../utils/logger";

export const startWorkers = () => {
  logger.info("Starting BullMQ workers...");

  const motivationWorker = createMotivationWorker();
  const activityWorker = createActivityWorker();

  logger.info("All BullMQ workers started successfully");

  return {
    motivationWorker,
    activityWorker,
  };
};

export const stopWorkers = async (workers: ReturnType<typeof startWorkers>) => {
  logger.info("Stopping BullMQ workers...");

  await Promise.all([
    workers.motivationWorker.close(),
    workers.activityWorker.close(),
  ]);

  logger.info("All BullMQ workers stopped");
};
```

## Step 3: Update Job Functions

### Update sendMotivation.ts

Your current `src/worker/jobs/sendMotivation.ts` needs to be updated to handle per-server processing:

```typescript
import { getGuildDatabase } from "../../utils/guildDatabase";
import logger from "../../utils/logger";
// ... your other imports (Discord client, etc.)

// Updated function to handle single guild processing (per-server scheduling)
export const sendMotivation = async (guildId: string) => {
  logger.info(`Processing motivation for guild: ${guildId}`);

  try {
    const guild = await getGuildDatabase().guild.findUnique({
      where: { id: guildId },
      select: {
        id: true,
        motivationChannelId: true,
        // Include any other fields you need
      },
    });

    if (!guild || !guild.motivationChannelId) {
      logger.warn(`Guild ${guildId} not found or has no motivation channel`);
      return;
    }

    // Your existing motivation sending logic here
    // e.g., get random quote, send to Discord channel, etc.
    // This should be the core logic that sends a motivation message to one guild

    // Example structure (adapt to your existing logic):
    /*
    const channel = await bot.channels.fetch(guild.motivationChannelId);
    if (channel?.isTextBased()) {
      const quote = await getRandomQuote(); // Your existing quote logic
      await channel.send(quote);
    }
    */

    logger.info(`Motivation sent successfully to guild ${guildId}`);
  } catch (error) {
    logger.error(`Failed to send motivation to guild ${guildId}:`, error);
    throw error;
  }
};

// If you had a function that processed all guilds, remove it or keep it for manual testing
// The per-server scheduling from the queue guide handles timing per guild
```

### Update setActivity.ts

Your `src/worker/jobs/setActivity.ts` should work mostly as-is, but add better logging:

```typescript
import logger from "../../utils/logger";
// ... your existing imports

export const setActivity = async () => {
  logger.info("Starting Discord activity update");

  try {
    // Your existing activity logic here
    // This is typically a global Discord bot status update

    logger.info("Discord activity updated successfully");
  } catch (error) {
    logger.error("Failed to update Discord activity:", error);
    throw error;
  }
};
```

## Step 4: Update Main Worker File

Replace your `src/worker/index.ts` to use BullMQ workers instead of cron:

```typescript
import logger from "../utils/logger";
import { startQueueSchedulers, stopQueueSchedulers } from "../schedulers";
import { startWorkers, stopWorkers } from "./workers";

let queueSchedulers: ReturnType<typeof startQueueSchedulers> | null = null;
let bullWorkers: ReturnType<typeof startWorkers> | null = null;

export const startWorkerSystem = () => {
  logger.info("Starting BullMQ worker system...");

  try {
    // Start BullMQ queue schedulers (from Queue Migration Guide)
    queueSchedulers = startQueueSchedulers();

    // Start BullMQ workers (new - from this guide)
    bullWorkers = startWorkers();

    logger.info("BullMQ worker system started successfully");
  } catch (error) {
    logger.error("Failed to start worker system:", error);
    throw new Error(`Worker system startup failed: ${error.message}`);
  }
};

export const stopWorkerSystem = async () => {
  logger.info("Stopping BullMQ worker system...");

  try {
    // Stop BullMQ schedulers
    if (queueSchedulers) {
      stopQueueSchedulers(queueSchedulers);
    }

    // Stop BullMQ workers
    if (bullWorkers) {
      await stopWorkers(bullWorkers);
    }

    logger.info("BullMQ worker system stopped successfully");
  } catch (error) {
    logger.error("Error stopping worker system:", error);
  }
};

// Graceful shutdown handlers
process.on("SIGINT", async () => {
  logger.info("Received SIGINT, shutting down gracefully...");
  await stopWorkerSystem();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down gracefully...");
  await stopWorkerSystem();
  process.exit(0);
});

// Start the system if this file is run directly
if (require.main === module) {
  try {
    startWorkerSystem();
  } catch (error) {
    logger.error("Failed to start worker system from CLI:", error);
    process.exit(1);
  }
}
```

## Step 5: Testing Worker Processing

### Create Worker Test Script

Create `src/test-workers.ts`:

```typescript
import { motivationQueue, activityQueue } from "./queues";
import logger from "./utils/logger";

export const testWorkers = async () => {
  logger.info("Testing worker processing...");

  try {
    // Add test jobs and monitor processing
    logger.info("Adding test activity job...");
    const activityJob = await activityQueue.add("test-activity", {
      source: "worker-test",
      timestamp: new Date().toISOString(),
    });

    logger.info("Adding test motivation job...");
    const motivationJob = await motivationQueue.add("test-motivation", {
      guildId: "test-guild-456",
      source: "worker-test",
      timestamp: new Date().toISOString(),
    });

    // Wait a bit for processing
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check job status
    const activityJobStatus = await activityJob.getState();
    const motivationJobStatus = await motivationJob.getState();

    logger.info(`Activity job ${activityJob.id} status: ${activityJobStatus}`);
    logger.info(
      `Motivation job ${motivationJob.id} status: ${motivationJobStatus}`
    );

    // Check for failed jobs
    const activityFailed = await activityQueue.getFailed();
    const motivationFailed = await motivationQueue.getFailed();

    if (activityFailed.length > 0) {
      logger.warn(`Activity queue has ${activityFailed.length} failed jobs`);
      logger.warn(
        "Recent failures:",
        activityFailed.slice(0, 3).map((job) => ({
          id: job.id,
          failedReason: job.failedReason,
          attemptsMade: job.attemptsMade,
        }))
      );
    }

    if (motivationFailed.length > 0) {
      logger.warn(
        `Motivation queue has ${motivationFailed.length} failed jobs`
      );
      logger.warn(
        "Recent failures:",
        motivationFailed.slice(0, 3).map((job) => ({
          id: job.id,
          failedReason: job.failedReason,
          attemptsMade: job.attemptsMade,
          guildId: job.data?.guildId,
        }))
      );
    }
  } catch (error) {
    logger.error("Worker test failed:", error);
  }
};

// Run test if called directly
if (require.main === module) {
  testWorkers().then(() => {
    logger.info("Worker test completed");
    process.exit(0);
  });
}
```

### Monitor Worker Performance

Add worker monitoring to your health endpoint:

```typescript
// Add to your existing API routes (likely in src/api/routes/)
app.get("/health/workers", async (req, res) => {
  try {
    // Use efficient getJobCounts() instead of materializing full job arrays
    const [motivationCounts, activityCounts] = await Promise.all([
      motivationQueue.getJobCounts(),
      activityQueue.getJobCounts(),
    ]);

    // Calculate throughput efficiently by sampling recent completed jobs
    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    const [motivationRecentCompleted, activityRecentCompleted] =
      await Promise.all([
        // Get last 1000 completed jobs efficiently (most recent first)
        motivationQueue.getJobs(["completed"], -1000, -1),
        activityQueue.getJobs(["completed"], -1000, -1),
      ]);

    // Count jobs completed in the last hour
    const motivationLastHour = motivationRecentCompleted.filter(
      (job) => (job.finishedOn || 0) > oneHourAgo
    ).length;

    const activityLastHour = activityRecentCompleted.filter(
      (job) => (job.finishedOn || 0) > oneHourAgo
    ).length;

    const workerHealth = {
      motivation: {
        waiting: motivationCounts.waiting,
        active: motivationCounts.active,
        completed: motivationCounts.completed,
        failed: motivationCounts.failed,
        throughput: {
          lastHour: motivationLastHour,
        },
      },
      activity: {
        waiting: activityCounts.waiting,
        active: activityCounts.active,
        completed: activityCounts.completed,
        failed: activityCounts.failed,
        throughput: {
          lastHour: activityLastHour,
        },
      },
    };

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      workers: workerHealth,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});
```

## Step 6: Final Cleanup

### Remove Cron Dependencies

Since you're doing a complete migration (not parallel), remove the old cron dependencies:

```bash
# Remove node-cron if it was being used
npm uninstall node-cron @types/node-cron

# Remove any other cron-related dependencies
```

### Clean Up Old Cron Code

Remove any remaining cron-related imports and logic from your codebase:

```bash
# Search for cron references to clean up
grep -r "cron" src/ --exclude-dir=node_modules
grep -r "schedule" src/ --exclude-dir=node_modules
```

## Step 7: Validation Checklist

Before considering the migration complete:

- [ ] ✅ Workers are processing jobs correctly
- [ ] ✅ No failed jobs accumulating
- [ ] ✅ Timing matches your previous schedule
- [ ] ✅ Error handling works (test by breaking something temporarily)
- [ ] ✅ Graceful shutdown works
- [ ] ✅ Jobs survive server restarts (test by restarting app)
- [ ] ✅ Performance is acceptable (check response times)
- [ ] ✅ Logs are clear and helpful
- [ ] ✅ Health endpoints show good status
- [ ] ✅ No memory leaks (monitor over time)
- [ ] ✅ All cron code has been removed
- [ ] ✅ Function-based approach (no classes)
- [ ] ✅ Per-server scheduling works correctly

## Benefits After Migration

1. **Improved Reliability**: Jobs survive server restarts
2. **Better Error Handling**: Automatic retries with exponential backoff
3. **Monitoring**: Built-in job monitoring and metrics
4. **Scalability**: Easy to add more workers or distribute across servers
5. **Debugging**: Clear job history and failure tracking
6. **Flexibility**: Easy to add new job types and modify scheduling
7. **Per-Server Scheduling**: Each guild gets motivation at their specific time
8. **Clean Architecture**: Separate concerns between queues and workers

## Troubleshooting

### Jobs Not Processing

1. Check worker logs for errors
2. Verify workers are connected to correct queues
3. Test with manual job addition
4. Check Redis connectivity
5. Verify queue names match between schedulers and workers

### Performance Issues

1. Adjust worker concurrency settings
2. Monitor Redis memory usage
3. Check for job processing bottlenecks
4. Review error rates and retry logic

### Memory Issues

1. Monitor job cleanup settings (`removeOnComplete`, `removeOnFail`)
2. Check for job data size
3. Monitor Redis memory over time
4. Adjust queue retention policies

### Failed Jobs Accumulating

1. Review job processing logic for errors
2. Check retry settings in queue configuration
3. Add better error handling in job functions
4. Monitor and alert on failed job counts

### Per-Server Timing Issues

1. Verify timezone handling in motivation scheduler
2. Check guild data has correct `motivationTime` and `timezone` fields
3. Add debug logs in scheduler's `shouldSendMotivation` function
4. Test with different timezones

Congratulations! You've successfully completed the migration from cron jobs to a robust, function-based BullMQ system with proper separation of concerns between queues and workers!
