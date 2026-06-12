import { Client, Events, GatewayIntentBits } from "discord.js";
import { Queue } from "bullmq";
import type { Worker } from "bullmq";

import env from "./utils/env.js";
import logger from "./utils/logger.js";
import { isPremiumEnabled } from "./utils/premium.js";
import redisClient, { bullConnection } from "./redis/index.js";
import startWorker from "./worker/index.js";

/**
 * Import events from the events folder.
 */
import { readyEvent } from "./events/ready.js";
import { guildCreateEvent } from "./events/guildCreate.js";
import { guildDeleteEvent } from "./events/guildDelete.js";
import { interactionCreateEvent } from "./events/interactionCreate.js";
import { shardDisconnectEvent } from "./events/shardDisconnect.js";
import { entitlementCreateEvent } from "./events/entitlementCreate.js";
import { entitlementUpdateEvent } from "./events/entitlementUpdate.js";
import { entitlementDeleteEvent } from "./events/entitlementDelete.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

/**
 * This event will run if the bot starts, and logs in, successfully. Also sets the bot's activity.
 */
client.on(Events.ClientReady, async () => {
  try {
    await readyEvent(client);
  } catch (err) {
    logger.error(
      "Discord - Event (Ready)",
      "Error during client ready event",
      err
    );
    process.exit(1);
  }
});

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
    logger.error("Discord - Event (GuildDelete)", "Unhandled error", err);
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
client.on(Events.ShardDisconnect, () => {
  shardDisconnectEvent();
});

client.on(Events.ShardError, (err) => {
  logger.error("Discord - Shard", "Shard websocket error", err);
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

/**
 * Initialize BullMQ worker to handle background jobs.
 */
const queueName = "fluffboost-jobs";

const queue = new Queue(queueName, {
  connection: bullConnection,
});

let worker: Worker | null = null;

// Gate worker startup on ClientReady. Otherwise BullMQ can dequeue jobs
// (e.g. send-motivation) before Discord login completes, causing
// client.channels.fetch / client.users.fetch calls inside job handlers to
// fail against an un-authenticated client.
client.once(Events.ClientReady, () => {
  startWorker(queue, client)
    .then((startedWorker) => {
      worker = startedWorker;
    })
    .catch((err) => {
      logger.error("Worker", "Failed to start worker", err);
      process.exit(1);
    });
});

client.login(env.DISCORD_APPLICATION_BOT_TOKEN);

/**
 * Graceful shutdown. The ShardingManager kills shards with SIGTERM on
 * redeploy; without a handler, BullMQ jobs die mid-flight (stalled-job
 * retries can double-send motivation) and the Discord session is never
 * cleanly closed. Order: worker (finish in-flight jobs) → queue → Discord
 * session → Redis.
 */
let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info("Discord", `Received ${signal}, shutting down shard`);

  // Watchdog so a wedged close never outlives the orchestrator's kill grace.
  setTimeout(() => process.exit(1), 20_000).unref();

  try {
    if (worker) {
      await worker.close();
    }
    await queue.close();
    await client.destroy();
    await redisClient.quit().catch(() => redisClient.disconnect());
    process.exit(0);
  } catch (err) {
    logger.error("Discord", "Error during shard shutdown", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

export default client;
