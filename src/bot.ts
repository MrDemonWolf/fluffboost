import { Client, Events, GatewayIntentBits } from "discord.js";

import env from "./utils/env";
import logger from "./utils/logger";

/**
 * Import events from the events folder.
 */
import { readyEvent } from "./events/ready";
import { guildCreateEvent } from "./events/guildCreate";
import { guildDeleteEvent } from "./events/guildDelete";
import { interactionCreateEvent } from "./events/interactionCreate";
import { shardDisconnectEvent } from "./events/shardDisconnect";

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
  guildCreateEvent(guild);
});

/**
 * This event will run every time the bot leaves a guild.
 */
client.on(Events.GuildDelete, (guild) => {
  guildDeleteEvent(guild);
});

/**
 * Handle interactionCreate events.
 */
client.on(Events.InteractionCreate, (interaction) => {
  interactionCreateEvent(client, interaction);
});

/**
 * Handle discord ShardDisconnect event.
 */
client.on(Events.ShardError, () => {
  shardDisconnectEvent();
});

client.login(env.DISCORD_APPLICATION_BOT_TOKEN);

/**
 * Initialize BullMQ worker to handle background jobs.
 */
import { Queue } from "bullmq";
import worker from "./worker";

const queueName = "fluffboost-jobs";

const queue = new Queue(queueName, {
  connection: env.REDIS_URL
    ? { url: env.REDIS_URL }
    : { host: "localhost", port: 6379 },
});

worker(queue);

export default client;
