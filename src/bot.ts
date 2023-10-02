import { Client, Events, GatewayIntentBits } from "discord.js";

/**
 * Import events from the events folder.
 */
import { readyEvent } from "./events/ready";
import { guildCreateEvent } from "./events/guildCreate";
import { guildDeleteEvent } from "./events/guildDelete";
import { interactionCreateEvent } from "./events/interactionCreate";

/**
 * Import functions from the utils folder.
 */
import { setActivity } from "./utils/setActivity";

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
    await readyEvent(client);
    setActivity(client); // set activity on startup
    setInterval(() => {
      setActivity(client);
    }, 30 * 60 * 1000); // will set activity every 30 minutes
    worker();
  } catch (err) {
    console.log(err);
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

client.login(process.env.DISCORD_APPLICATION_BOT_TOKEN);

export default client;
