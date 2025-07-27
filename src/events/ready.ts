import consola from "consola";

import type { Client } from "discord.js";

import setActivity from "../worker/jobs/setActivity";
import { pruneGuilds, ensureGuildExists } from "../utils/guildDatabase";

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
    consola.success({
      message: "[Discord] Bot is ready! 🐾",
      badge: true,
      timestamp: new Date(),
    });

    consola.info({
      message: `[Discord] Logged in as ${client.user?.tag}!`,
      badge: true,
      timestamp: new Date(),
    });

    /**
     * Show how many guilds the bot is in and their names + IDs. but this is shared across all shards.
     */
    consola.info({
      message: `[Discord] In ${client.guilds.cache.size} guilds.`,
      badge: true,
      timestamp: new Date(),
    });

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
    consola.info({
      message: "[Slash commands] Registering ",
      badge: true,
      timestamp: new Date(),
    });

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

    consola.success({
      message: `[Slash commands] Registered ${commands?.map(
        (command) => command.name
      )} commands`,
      badge: true,
      timestamp: new Date(),
    });
  } catch (err) {
    consola.error({
      message: `[Discord] Error logging in to discord: ${err}`,
      badge: true,
      timestamp: new Date(),
    });
  }

  /**
   * Apply the bot's activity status on first run and every 60 minutes.
   */
  await setActivity(client);
}
