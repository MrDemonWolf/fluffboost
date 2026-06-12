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
     * Register slash commands. They are global (application-level), so only
     * shard 0 registers — otherwise every shard performs the same bulk
     * overwrite on every startup.
     */
    if (client.shard?.ids.includes(0) ?? true) {
      logger.info("Discord - Slash Commands", "Registering commands");

      const commands = await client.application?.commands.set(slashCommands);
      const commandNames = commands?.map((command) => command.name) || [];

      logger.success(
        "Discord - Slash Commands",
        `Registered ${commandNames.length} commands`,
        {
          commands: commandNames,
          timestamp: new Date().toISOString(),
        }
      );
    }

    /**
     * Apply this shard's initial activity (local-only: sibling shards may not
     * be ready yet, and each shard runs this for itself). The worker's
     * set-activity ticks handle the cross-shard rotation afterwards.
     */
    await setActivity(client, { scope: "local" });
  } catch (err) {
    logger.error("Discord - Event (Ready)", "Error during ready event", err);
  }
}
