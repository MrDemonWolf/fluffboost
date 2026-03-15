import { Client, Events, GatewayIntentBits } from "discord.js";

import env from "./utils/env.js";
import logger from "./utils/logger.js";
import { isPremiumEnabled } from "./utils/premium.js";

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
    readyEvent(client);
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
 * Handle discord ShardDisconnect event.
 */
client.on(Events.ShardError, () => {
  shardDisconnectEvent();
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

client.login(env.DISCORD_APPLICATION_BOT_TOKEN);

/**
 * Initialize BullMQ worker to handle background jobs.
 */
import { Queue } from "bullmq";
import worker from "./worker/index.js";

const queueName = "fluffboost-jobs";

const queue = new Queue(queueName, {
  connection: env.REDIS_URL
    ? { url: env.REDIS_URL }
    : { host: "localhost", port: 6379 },
});

worker(queue);

export default client;
