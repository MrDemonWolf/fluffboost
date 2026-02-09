import type { Client } from "discord.js";

import setActivity from "../worker/jobs/setActivity.js";
import { pruneGuilds, ensureGuildExists } from "../utils/guildDatabase.js";
import logger from "../utils/logger.js";

/**
 * Import slash commands from the commands folder.
 */
import help from "../commands/help.js";
import about from "../commands/about.js";
import quote from "../commands/quote.js";
import suggestion from "../commands/suggestion.js";
import invite from "../commands/invite.js";
import setup from "../commands/setup/index.js";
import admin from "../commands/admin/index.js";
import changelog from "../commands/changelog.js";
import premium from "../commands/premium.js";
import owner from "../commands/owner/index.js";

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

    await client.application?.commands.set([
      help.slashCommand,
      about.slashCommand,
      quote.slashCommand,
      suggestion.slashCommand,
      invite.slashCommand,
      setup.slashCommand,
      admin.slashCommand,
      changelog.slashCommand,
      premium.slashCommand,
      owner.slashCommand,
    ]);

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
