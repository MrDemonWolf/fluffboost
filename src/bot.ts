import { Client, Events, GatewayIntentBits } from "discord.js";
import consola from "consola";

import env from "./utils/env";

/**
 * Import events from the events folder.
 */
import { readyEvent } from "./events/ready";
import { guildCreateEvent } from "./events/guildCreate";
import { guildDeleteEvent } from "./events/guildDelete";
import { interactionCreateEvent } from "./events/interactionCreate";
import { shardDisconnectEvent } from "./events/shardDisconnect";

/**
 * Import worker main function.
 */
import worker from "./worker";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

/**
 * This event will run if the bot starts, and logs in, successfully. Also sets the bot's activity.
 */
client.on(Events.ClientReady, async () => {
  try {
    readyEvent(client);
    worker();
  } catch (err) {
    consola.error(err);
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

export default client;
