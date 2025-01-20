import type { Client } from "discord.js";
import consola from "consola";
import cron from "node-cron";

import { prisma } from "../database";
import { setActivity } from "../utils/setActivity";
/**
 * Import slash commands from the commands folder.
 */
import help from "../commands/help";
import about from "../commands/about";
import quote from "../commands/quote";
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
     * Check if guilds exist in the database and add them if they don't.
     */
    const currentGuilds = await prisma.guild.findMany();

    const guildsToAdd = client.guilds.cache.filter(
      (guild) =>
        !currentGuilds.some((currentGuild) => currentGuild.guildId === guild.id)
    );

    guildsToAdd.forEach(async (guild) => {
      try {
        await prisma.guild.create({
          data: {
            guildId: guild.id,
          },
        });
        consola.success({
          message: `[Discord Event Logger - ReadyEvt] Created guild ${guild.name} (ID: ${guild.id}) in the database`,
          badge: true,
        });
      } catch (err) {
        console.error({
          message: `[Discord Event Logger - ReadyEvt] Error creating guild in database: ${err}`,
          badge: true,
          level: "error",
          timestamp: new Date(),
        });
      }
    });

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
