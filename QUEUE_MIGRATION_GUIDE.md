# BullMQ Queue Migration Guide

This guide focuses **only** on setting up BullMQ queues and basic job scheduling. After completing this, you'll move on to the Worker Migration Guide.

## Migration Strategy Explained

We're doing a **complete replacement** of your cron system with BullMQ, but we're breaking it into two focused phases to make it manageable:

### **What We're NOT Doing:**

- ❌ Running both cron and BullMQ at the same time
- ❌ Keeping your old cron system around "just in case"
- ❌ Having duplicate job scheduling

### **What We ARE Doing:**

- ✅ **Phase 1 (This Guide)**: Replace cron scheduling → BullMQ queue scheduling
- ✅ **Phase 2 (Next Guide)**: Replace direct job execution → BullMQ worker processing

### **Current State → After Phase 1:**

```
BEFORE (Cron System):
Cron schedule → Directly runs sendMotivation() and setActivity()

AFTER (Phase 1 - Queue System):
BullMQ scheduler → Adds jobs to queues → Still runs sendMotivation() and setActivity() directly
```

### **After Phase 2 (Complete BullMQ):**

```
BullMQ scheduler → Adds jobs to queues → BullMQ workers process jobs
```

This way, you get a **complete, clean migration** without the complexity of managing two systems at once.

## What Happens in This Phase

In Phase 1, you'll **completely remove** your cron job scheduling and replace it with BullMQ queue scheduling:

### **Before This Guide:**

```typescript
// Your current cron-based system
cron.schedule("0 9 * * *", () => {
  sendMotivation(); // Runs directly
});

cron.schedule("*/30 * * * *", () => {
  setActivity(); // Runs directly
});
```

### **After This Guide:**

```typescript
// BullMQ queue scheduling (replaces cron completely)
// Every minute, check if any guilds need motivation
setInterval(async () => {
  const guilds = await findGuildsNeedingMotivation();
  for (const guild of guilds) {
    await motivationQueue.add("send-motivation", { guildId: guild.id });
  }
}, 60000);

// Every 30 minutes, add activity job
setInterval(async () => {
  await activityQueue.add("update-activity", {});
}, 30 * 60 * 1000);
```

**Key Point**: Your job functions (`sendMotivation`, `setActivity`) still work the same way - we're only changing **when and how they get triggered**.

## Overview

In this first phase, we'll:

- Set up BullMQ queues with proper configuration
- Create basic job scheduling (replacing cron timing)
- Test that jobs are being added to queues correctly
- **Replace your existing cron system completely**

## Step 1: Install Dependencies (if not already installed)

BullMQ should already be in your package.json, but verify:

```bash
npm list bullmq
```

If not installed:

```bash
npm install bullmq
```

## Step 2: Create Queue Configuration

Create the new directory structure for queues:

```bash
mkdir -p src/queues
```

### Create Main Queue Index

Create `src/queues/index.ts`:

```typescript
import { Queue } from "bullmq";
import redisClient from "../redis";

// Create queues for different job types
export const motivationQueue = new Queue("motivation", {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 20, // Keep last 20 failed jobs
    attempts: 3, // Retry failed jobs up to 3 times
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

export const activityQueue = new Queue("activity", {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 5,
    removeOnFail: 10,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});

// Optional: Health check queue for monitoring
export const healthQueue = new Queue("health", {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 5,
    removeOnFail: 5,
  },
});
```

### Create Individual Queue Files (Optional)

For better organization, you can split each queue:

Create `src/queues/motivationQueue.ts`:

```typescript
import { Queue } from "bullmq";
import redisClient from "../redis";

export const motivationQueue = new Queue("motivation", {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 20,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});
```

Create `src/queues/activityQueue.ts`:

```typescript
import { Queue } from "bullmq";
import redisClient from "../redis";

export const activityQueue = new Queue("activity", {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: 5,
    removeOnFail: 10,
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
});
```

Then update `src/queues/index.ts`:

```typescript
export { motivationQueue } from "./motivationQueue";
export { activityQueue } from "./activityQueue";
// export { healthQueue } from "./healthQueue"; // if you create this file too
```

## Step 3: Create Queue Schedulers

Create the scheduler directory:

```bash
mkdir -p src/schedulers
```

### Create Main Scheduler

Create `src/schedulers/index.ts`:

```typescript
import { motivationQueue, activityQueue } from "../queues";
import logger from "../utils/logger";
import { startMotivationScheduler } from "./motivationScheduler";

export const startQueueSchedulers = () => {
  logger.info("Starting BullMQ queue schedulers...");

  // Start activity scheduler (every 30 minutes)
  const activityInterval = setInterval(async () => {
    try {
      await activityQueue.add("update-activity", {});
      logger.info("Activity job added to queue");
    } catch (error) {
      logger.error("Failed to add activity job to queue:", error);
    }
  }, 30 * 60 * 1000); // 30 minutes

  // Start motivation scheduler
  const motivationScheduler = startMotivationScheduler();

  logger.info("Queue schedulers started successfully");

  return {
    activityInterval,
    motivationScheduler,
  };
};

export const stopQueueSchedulers = (
  schedulers: ReturnType<typeof startQueueSchedulers>
) => {
  logger.info("Stopping queue schedulers...");

  if (schedulers.activityInterval) {
    clearInterval(schedulers.activityInterval);
  }

  if (schedulers.motivationScheduler) {
    clearInterval(schedulers.motivationScheduler);
  }

  logger.info("Queue schedulers stopped");
};
```

### Create Motivation Scheduler

Create `src/schedulers/motivationScheduler.ts`:

```typescript
import { motivationQueue } from "../queues";
import { getGuildDatabase } from "../utils/guildDatabase";
import logger from "../utils/logger";

export const startMotivationScheduler = () => {
  logger.info("Starting motivation queue scheduler...");

  // Check every minute for guilds that need motivation messages
  const interval = setInterval(async () => {
    try {
      await scheduleMotivationJobs();
    } catch (error) {
      logger.error("Error in motivation scheduler:", error);
    }
  }, 60 * 1000); // Check every minute

  return interval;
};

const scheduleMotivationJobs = async () => {
  try {
    const guilds = await getGuildDatabase().guild.findMany({
      where: {
        motivationChannelId: {
          not: null,
        },
        motivationTime: {
          not: null,
        },
      },
      select: {
        id: true,
        motivationTime: true,
        timezone: true,
      },
    });

    const now = new Date();

    for (const guild of guilds) {
      if (shouldSendMotivation(guild, now)) {
        // Add job to queue for this guild
        await motivationQueue.add(
          `motivation-${guild.id}`,
          { guildId: guild.id },
          {
            // Ensure we don't schedule duplicate jobs for the same guild on the same day
            jobId: `motivation-${guild.id}-${now.toDateString()}`,
            // Remove job after 24 hours if not processed
            removeOnComplete: true,
            removeOnFail: true,
          }
        );

        logger.info(`Added motivation job to queue for guild ${guild.id}`);
      }
    }
  } catch (error) {
    logger.error("Error scheduling motivation jobs:", error);
  }
};

const shouldSendMotivation = (
  guild: { id: string; motivationTime: string | null; timezone: string | null },
  now: Date
): boolean => {
  if (!guild.motivationTime || !guild.timezone) {
    return false;
  }

  try {
    // Convert current time to guild's timezone
    const guildTime = new Date(
      now.toLocaleString("en-US", { timeZone: guild.timezone })
    );
    const [hours, minutes] = guild.motivationTime.split(":").map(Number);

    // Check if current time matches the scheduled time (within 1 minute window)
    const currentHour = guildTime.getHours();
    const currentMinute = guildTime.getMinutes();

    return currentHour === hours && currentMinute === minutes;
  } catch (error) {
    logger.error(`Error parsing time for guild ${guild.id}:`, error);
    return false;
  }
};
```

## Step 4: Create Test Queue Integration

Create a simple test file to verify queues are working:

Create `src/test-queues.ts`:

```typescript
import { motivationQueue, activityQueue } from "./queues";
import logger from "./utils/logger";

export const testQueues = async () => {
  logger.info("Testing queue operations...");

  try {
    // Test activity queue
    await activityQueue.add("test-activity", {});
    logger.info("✓ Activity job added to queue");

    // Test motivation queue
    await motivationQueue.add("test-motivation", { guildId: "test-guild-123" });
    logger.info("✓ Motivation job added to queue");

    // Check queue status
    const activityWaiting = await activityQueue.getWaiting();
    const motivationWaiting = await motivationQueue.getWaiting();

    logger.info(`Activity queue: ${activityWaiting.length} waiting jobs`);
    logger.info(`Motivation queue: ${motivationWaiting.length} waiting jobs`);

    // List some job details
    if (activityWaiting.length > 0) {
      logger.info(
        "Recent activity jobs:",
        activityWaiting
          .slice(0, 3)
          .map((job) => ({ id: job.id, name: job.name }))
      );
    }

    if (motivationWaiting.length > 0) {
      logger.info(
        "Recent motivation jobs:",
        motivationWaiting
          .slice(0, 3)
          .map((job) => ({ id: job.id, name: job.name, data: job.data }))
      );
    }
  } catch (error) {
    logger.error("Queue test failed:", error);
  }
};

// Run test if called directly
if (require.main === module) {
  testQueues().then(() => {
    logger.info("Queue test completed");
    process.exit(0);
  });
}
```

## Step 5: Replace Cron with Queue Schedulers

**Important**: We'll completely replace your existing cron system with BullMQ schedulers.

Update your `src/worker/index.ts` to remove cron jobs and add queue scheduling:

```typescript
import logger from "../utils/logger";
import { startQueueSchedulers, stopQueueSchedulers } from "../schedulers";

let queueSchedulers: ReturnType<typeof startQueueSchedulers> | null = null;

export const startWorkerSystem = () => {
  logger.info("Starting BullMQ queue scheduler system...");

  // Replace your existing cron job startup with queue schedulers
  queueSchedulers = startQueueSchedulers();

  logger.info("BullMQ queue scheduler system started successfully");
};

export const stopWorkerSystem = async () => {
  logger.info("Stopping queue scheduler system...");

  // Stop queue schedulers
  if (queueSchedulers) {
    stopQueueSchedulers(queueSchedulers);
  }

  logger.info("Queue scheduler system stopped");
};

// Keep your existing graceful shutdown handlers
```

## Step 6: Database Schema (If Not Already Done)

Ensure your Prisma schema has the required fields:

```prisma
model Guild {
  id                    String   @id
  // ... your existing fields
  motivationChannelId   String?
  motivationTime        String?  // Format: "HH:MM" (24-hour format)
  timezone              String?  // IANA timezone identifier (e.g., "America/New_York")
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}
```

If these fields don't exist, create a migration:

```bash
npx prisma migrate dev --name add_motivation_scheduling_fields
```

## Step 7: Testing Your Queue Setup

### 1. Test Queue Creation

```bash
npm run dev
# or however you start your app

# Then in another terminal:
node -e "require('./dist/test-queues').testQueues()"
```

### 2. Monitor Redis (Optional)

```bash
# Connect to Redis CLI
redis-cli

# Check for BullMQ keys
KEYS "bull:*"

# Monitor queue activity
MONITOR
```

### 3. Add Manual Test Jobs

Create a simple script to add jobs manually:

```typescript
// scripts/add-test-jobs.ts
import { motivationQueue, activityQueue } from "../src/queues";

async function addTestJobs() {
  console.log("Adding test jobs...");

  await activityQueue.add("manual-test", { source: "manual-test" });
  await motivationQueue.add("manual-test", {
    guildId: "test-guild",
    source: "manual-test",
  });

  console.log("Test jobs added!");
  process.exit(0);
}

addTestJobs();
```

## Step 8: Monitor Queue Health

Add a simple health check endpoint to monitor your queues:

```typescript
// Add this to your main API routes
app.get("/health/queues", async (req, res) => {
  try {
    const queueHealth = {
      motivation: {
        waiting: await motivationQueue.getWaiting().then((jobs) => jobs.length),
        active: await motivationQueue.getActive().then((jobs) => jobs.length),
        completed: await motivationQueue
          .getCompleted()
          .then((jobs) => jobs.length),
        failed: await motivationQueue.getFailed().then((jobs) => jobs.length),
      },
      activity: {
        waiting: await activityQueue.getWaiting().then((jobs) => jobs.length),
        active: await activityQueue.getActive().then((jobs) => jobs.length),
        completed: await activityQueue
          .getCompleted()
          .then((jobs) => jobs.length),
        failed: await activityQueue.getFailed().then((jobs) => jobs.length),
      },
    };

    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      queues: queueHealth,
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

## Step 9: Validation Checklist

Before moving to the Worker Migration Guide, verify:

- [ ] ✅ BullMQ queues are created successfully
- [ ] ✅ Jobs are being added to queues on schedule
- [ ] ✅ Redis contains the expected queue data
- [ ] ✅ No errors in logs related to queue operations
- [ ] ✅ Health endpoint shows queue status
- [ ] ✅ Queue schedulers have replaced cron jobs completely
- [ ] ✅ Manual test jobs can be added successfully
- [ ] ✅ Timing matches your previous cron schedule

## What's Next?

Once this queue setup is working perfectly:

1. **Test thoroughly** for a few days to ensure stability
2. **Monitor the queues** to see jobs being added correctly
3. **Verify timing** matches your previous cron schedule
4. **Move to Worker Migration Guide** to replace job processing with BullMQ workers
5. **Your cron jobs are now completely replaced** with BullMQ scheduling

## Troubleshooting

### Jobs Not Being Added

- Check Redis connection in logs
- Verify queue configuration matches Redis client
- Test manual job addition script

### Timing Issues

- Verify timezone handling in scheduler
- Check guild data has correct `motivationTime` and `timezone`
- Add debug logs in `shouldSendMotivation` function

### Redis Issues

- Confirm Redis is running: `redis-cli ping`
- Check Redis logs for connection errors
- Verify Redis URL in environment

This focused approach lets you validate the queue system works perfectly before touching your existing worker logic!
