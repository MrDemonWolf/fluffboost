import type { Client } from "discord.js";
import consola from "consola";
import { prisma } from "../database";

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
import owner from "../commands/owner";

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
     * Add any new guilds to the database if they don't already exist. Only in development mode.
     */
    if (process.env.NODE_ENV === "development") {
      const guilds = client.guilds.cache.map((guild) => {
        return {
          name: guild.name,
          id: guild.id,
        };
      });
      guilds.map(async (guild) => {
        const guildExists = await prisma.guild.findUnique({
          where: {
            guildId: guild.id,
          },
        });

        if (!guildExists) {
          await prisma.guild.create({
            data: {
              guildId: guild.id,
            },
          });
          consola.success({
            message: `Added ${guild.name} to the database as it didn't already exist`,
            badge: true,
          });
        }
      });
    }

    /**
     * Register slash commands.
     */
    consola.info({
      message: `Registering slash commands...`,
      badge: true,
    });

    await client.application?.commands.set([
      owner.slashCommand,
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
}
