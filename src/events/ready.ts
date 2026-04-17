import type { Client } from "discord.js";

import logger from "../utils/logger.js";
import { slashCommands } from "./commandRegistry.js";
import { pruneGuilds, ensureGuildExists, setActivity } from "./readyDeps.js";

export async function readyEvent(client: Client) {
  try {
    /**
     * Show the bot is ready in the console.
     */
    const username = client.user?.tag || "Unknown";
    const guildCount = client.guilds.cache.size;

    logger.discord.ready(username, guildCount);

    /**
     * Check if the bot is not in a guild anymore and remove it from the database.
     */
    await pruneGuilds(client);

    /**
     * Check if guilds exist in the database and add them if they don't.
     */
    await ensureGuildExists(client);

    /**
     * Register slash commands.
     */
    logger.info("Discord - Slash Commands", "Registering commands");

    await client.application?.commands.set(slashCommands);

    const commands = await client.application?.commands.fetch();
    const commandNames = commands?.map((command) => command.name) || [];

    logger.success(
      "Discord - Slash Commands",
      `Registered ${commandNames.length} commands`,
      {
        commands: commandNames,
        timestamp: new Date().toISOString(),
      }
    );
  } catch (err) {
    logger.error("Discord - Event (Ready)", "Error during ready event", err);
  }

  /**
   * Apply the bot's activity status on first run then the worker will handle it every configured interval.
   */
  await setActivity(client);
}
