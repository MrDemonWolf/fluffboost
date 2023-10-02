import type { Client } from "discord.js";
import consola from "consola";

/**
 * Import slash commands from the commands folder.
 */
import about from "../commands/about";
import quote from "../commands/quote";
import setup from "../commands/setup";
import admin from "../commands/admin";

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
     * Make array of the guild name and id.
     */
    const guilds = client.guilds.cache.map((guild) => {
      return {
        name: guild.name,
        id: guild.id,
      };
    });

    consola.info({
      message: `Current guilds: ${JSON.stringify(guilds)}`,
      badge: true,
    });

    /**
     * Register slash commands.
     */
    consola.info({
      message: `Registering slash commands...`,
      badge: true,
    });

    await client.application?.commands.set([
      about.slashCommand,
      quote.slashCommand,
      setup.slashCommand,
      admin.slashCommand,
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
}
