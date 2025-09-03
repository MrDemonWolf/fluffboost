import type { Client } from "discord.js";

import setActivity from "../worker/jobs/setActivity";
import { pruneGuilds, ensureGuildExists } from "../utils/guildDatabase";
import logger from "../utils/logger";

/**
 * Import slash commands from the commands folder.
 */
import help from "../commands/help";
import about from "../commands/about";
import quote from "../commands/quote";
import suggestion from "../commands/suggestion";
import invite from "../commands/invite";
import setup from "../commands/setup";
import admin from "../commands/admin";
import changelog from "../commands/changelog";

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
    logger.info("Slash Commands", "Registering commands");

    await client.application?.commands.set([
      help.slashCommand,
      about.slashCommand,
      quote.slashCommand,
      suggestion.slashCommand,
      invite.slashCommand,
      setup.slashCommand,
      admin.slashCommand,
      changelog.slashCommand,
    ]);

    const commands = await client.application?.commands.fetch();
    const commandNames = commands?.map((command) => command.name) || [];

    logger.success(
      "Slash Commands",
      `Registered ${commandNames.length} commands`,
      {
        commands: commandNames,
      }
    );
  } catch (err) {
    logger.error("Discord", "Error during ready event", err);
  }

  /**
   * Apply the bot's activity status on first run and every 60 minutes.
   */
  await setActivity(client);
}
