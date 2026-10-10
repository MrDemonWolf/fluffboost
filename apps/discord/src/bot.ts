import { Client, Events, GatewayIntentBits, Options } from "discord.js";
import { Queue } from "bullmq";
import type { Worker } from "bullmq";

import env from "./utils/env.js";
import logger from "./utils/logger.js";
import { isPremiumEnabled } from "./utils/premium.js";
import { reconcilePremium, startPremiumReconciliationLoop } from "./utils/premiumReconciliation.js";
import { retryWithBackoff, sleep, withTimeout } from "./utils/async.js";
import { FATAL_EXIT_DELAY_MS, SHARD_SHUTDOWN_WATCHDOG_MS, closeRedis } from "./utils/shardShutdown.js";
import redisClient, { bullRedis } from "./redis/index.js";
import { createThrottledErrorLogger } from "./utils/throttledErrorLogger.js";
import startWorker, { QUEUE_NAME } from "./worker/index.js";

/**
 * Import events from the events folder.
 */
import { cancelReadyRetries, readyEvent } from "./events/ready.js";
import { guildCreateEvent } from "./events/guildCreate.js";
import { guildDeleteEvent } from "./events/guildDelete.js";
import { interactionCreateEvent } from "./events/interactionCreate.js";
import { shardDisconnectEvent } from "./events/shardDisconnect.js";
import { entitlementCreateEvent } from "./events/entitlementCreate.js";
import { entitlementUpdateEvent } from "./events/entitlementUpdate.js";
import { entitlementDeleteEvent } from "./events/entitlementDelete.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
  // Nothing the bot sends should ping; a deliberate ping must opt in per message.
  allowedMentions: { parse: [] },
  // Interactions cache their user and member forever by default. Bound both,
  // always keeping the bot's own member/user (guild.members.me, client.user).
  makeCache: Options.cacheWithLimits({
    ...Options.DefaultMakeCacheSettings,
    GuildMemberManager: {
      maxSize: 200,
      keepOverLimit: (member) => member.id === member.client.user.id,
    },
  }),
  sweepers: {
    ...Options.DefaultSweeperSettings,
    users: {
      interval: 3_600,
      filter: () => (user) => user.id !== user.client.user.id,
    },
  },
});

/**
 * Initialize the BullMQ queue (the worker starts once the client is ready).
 */
const queue = new Queue(QUEUE_NAME, {
  connection: bullRedis,
});
queue.on("error", createThrottledErrorLogger("Worker", "BullMQ queue error"));
redisClient.on("error", createThrottledErrorLogger("Database", "Redis error"));

let worker: Worker | null = null;
let stopPremiumLoop: (() => void) | null = null;
let initialReadyDone = false;

/**
 * This event will run if the bot starts, and logs in, successfully. readyEvent
 * is best-effort; only a worker that cannot start at all is fatal.
 */
async function onClientReady(): Promise<void> {
  if (shuttingDown) {
    return;
  }
  try {
    await readyEvent(client);
    initialReadyDone = true;
    if (isPremiumEnabled() && !shuttingDown) {
      stopPremiumLoop = startPremiumReconciliationLoop(client);
    }
    const started = await retryWithBackoff(() => startWorker(queue, client), {
      attempts: 3,
      baseMs: 5_000,
      maxMs: 20_000,
      onRetry: (err, attempt, delayMs) => {
        logger.warn("Worker", "Worker startup failed; retrying", { attempt, delayMs, error: err.message });
      },
    });
    if (shuttingDown) {
      await started.close();
      return;
    }
    worker = started;
  } catch (err) {
    logger.error("Discord", "Shard startup failed", err);
    fatal("Shard startup failed");
  }
}

// onClientReady handles its own failures, so the promise never rejects.
client.once(Events.ClientReady, () => void onClientReady());

/**
 * This event will run every time the bot joins a guild.
 */
client.on(Events.GuildCreate, (guild) => {
  guildCreateEvent(guild).catch((err) => {
    logger.error("Discord - Event (GuildCreate)", "Unhandled error", err);
  });
});

/**
 * This event will run every time the bot leaves a guild.
 */
client.on(Events.GuildDelete, (guild) => {
  guildDeleteEvent(guild).catch((err) => {
    logger.error("Discord - Event (Guild Delete)", "Unhandled error", err);
  });
});

/**
 * Handle interactionCreate events.
 */
client.on(Events.InteractionCreate, (interaction) => {
  interactionCreateEvent(client, interaction).catch((err) => {
    logger.error("Discord - Event (InteractionCreate)", "Unhandled error", err);
  });
});

/**
 * Handle discord shard lifecycle events.
 */
client.on(Events.ShardDisconnect, (event, shardId) => {
  shardDisconnectEvent(event, shardId, () => fatal("Unrecoverable gateway close"));
});

/**
 * A re-identified session (not a resume) does not replay entitlement events
 * missed while disconnected, so re-check Premium once it is ready again.
 */
client.on(Events.ShardReady, () => {
  if (!initialReadyDone || shuttingDown || !isPremiumEnabled()) {
    return;
  }
  reconcilePremium(client).catch((err) => {
    logger.error("Premium - Reconciliation", "Reconciliation after reconnect failed", err);
  });
});

client.on(Events.ShardError, (err) => {
  logger.error("Discord - Shard", "Shard websocket error", err);
});

client.on(Events.Error, (err) => {
  logger.error("Discord - Client", "Client error", err);
});

/**
 * Handle entitlement events for premium subscriptions.
 */
if (isPremiumEnabled()) {
  client.on(Events.EntitlementCreate, (entitlement) => {
    entitlementCreateEvent(entitlement).catch((err) => {
      logger.error("Discord - Event (EntitlementCreate)", "Unhandled error", err);
    });
  });

  client.on(Events.EntitlementUpdate, (oldEntitlement, newEntitlement) => {
    entitlementUpdateEvent(oldEntitlement, newEntitlement).catch((err) => {
      logger.error("Discord - Event (EntitlementUpdate)", "Unhandled error", err);
    });
  });

  client.on(Events.EntitlementDelete, (entitlement) => {
    entitlementDeleteEvent(entitlement).catch((err) => {
      logger.error("Discord - Event (EntitlementDelete)", "Unhandled error", err);
    });
  });
}

client.login(env.DISCORD_APPLICATION_BOT_TOKEN).catch((err) => {
  logger.error("Discord", "Failed to log in", err);
  fatal("Failed to log in");
});

/**
 * Graceful shutdown. The ShardingManager kills shards with SIGTERM on
 * redeploy; without a handler, BullMQ jobs die mid-flight and the Discord
 * session is never cleanly closed. Order: stop timers → abort in-flight jobs
 * (send-motivation stops claiming guilds, finishes claimed sends) → worker →
 * queue → Discord session → Redis. See shardShutdown.ts for the time budget.
 */
let shuttingDown = false;

/** Bounded wait for the queue's Redis connection before closing it (fits the 20 s shard watchdog). */
const QUEUE_READY_GRACE_MS = 1_000;

async function shutdown(reason: string, exitCode = 0, minExitDelayMs = 0): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  const startedAt = Date.now();
  logger.info("Discord", `${reason}: shutting down shard`);

  // Watchdog so a wedged close never outlives the parent's SIGKILL; a delayed
  // fatal exit gets its delay on top (nothing external is waiting on it).
  setTimeout(() => process.exit(1), SHARD_SHUTDOWN_WATCHDOG_MS + minExitDelayMs).unref();

  stopPremiumLoop?.();
  cancelReadyRetries();

  let code = exitCode;
  try {
    if (worker) {
      worker.cancelAllJobs("shutdown");
      await worker.close();
    }
    // A queue still connecting its lazy client would reject that connect()
    // with no listener once closed ("Connection is closed."); let it settle first.
    await withTimeout(queue.waitUntilReady(), QUEUE_READY_GRACE_MS, "Queue connection").catch(() => undefined);
    await queue.close();
    await client.destroy();
  } catch (err) {
    logger.error("Discord", "Error during shard shutdown", err);
    code = 1;
  }
  await Promise.all([closeRedis(redisClient), closeRedis(bullRedis)]);

  // Delayed fatal exits keep a respawned shard from hot-looping IDENTIFY.
  const remaining = minExitDelayMs - (Date.now() - startedAt);
  if (remaining > 0) {
    await sleep(remaining);
  }
  process.exit(code);
}

/** Tears the shard down now and exits non-zero after FATAL_EXIT_DELAY_MS. Callers log the error first. */
function fatal(reason: string): void {
  logger.warn("Discord", `Exiting shard in ${FATAL_EXIT_DELAY_MS / 1000}s`, { reason });
  void shutdown(reason, 1, FATAL_EXIT_DELAY_MS);
}

process.on("SIGTERM", () => void shutdown("Received SIGTERM"));
process.on("SIGINT", () => void shutdown("Received SIGINT"));
// The IPC channel closes when the manager is gone (killed, or exited without
// stopping this shard). Never outlive it: an orphaned shard would keep its
// gateway session and worker running beside the manager's replacement.
process.on("disconnect", () => void shutdown("Shard manager disconnected", 1));
process.on("unhandledRejection", (reason) => {
  logger.error("Discord", "Unhandled promise rejection", reason);
});
process.on("uncaughtException", (err) => {
  logger.error("Discord", "Uncaught exception", err);
  fatal("Uncaught exception");
});
