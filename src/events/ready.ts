import type { Client } from "discord.js";
import consola from "consola";
import cron from "node-cron";

import { prisma } from "../database";
import { setActivity } from "../utils/setActivity";
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
import posthog from "../utils/posthog";

export async function readyEvent(client: Client) {
  try {
    /**
     * Show the bot is ready in the console.
     */
    consola.success({
      message: "Discord bot is ready! 🐾",
      badge: true,
    });

    consola.info({
      message: `Logged in as ${client.user?.tag}!`,
      badge: true,
    });

    /**
     * Show how many guilds the bot is in and their names + IDs. but this is shared across all shards.
     */
    consola.info({
      message: `Currently in ${client.guilds.cache.size} guilds.`,
      badge: true,
    });

    /**
     * Check if the bot is not in a guild anymore and remove it from the database.
     */
    await pruneGuilds(client);
    \
    /**
     * Check if guilds exist in the database and add them if they don't.
     */
    await ensureGuildExists(client);

    /**
     * Register slash commands.
     */
    consola.info({
      message: `Registering slash commands...`,
      badge: true,
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
      message: `Slash commands registered: ${commands?.map(
        (command) => command.name
      )}`,
      badge: true,
    });
  } catch (err) {
    consola.error({
      message: `Error logging in to discord: ${err}`,
      badge: true,
    });
  }

  /**
   * Apply the bot's activity status on first run and every 60 minutes.
   */
  setActivity(client);
  cron.schedule("0 * * * *", () => {
    setActivity(client);
  });
}
