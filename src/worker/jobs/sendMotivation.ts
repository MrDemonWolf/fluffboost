import { TextChannel, EmbedBuilder } from "discord.js";
import type { Client } from "discord.js";

import { prisma } from "../../database";
import type { Guild } from "@prisma/client";
import posthog from "../../utils/posthog";
import logger from "../../utils/logger";

export default async function sendMotivation(client: Client) {
  /**
   * Get all guilds from the database that have the motivation channel set.
   */
  const guilds = await prisma.guild.findMany({
    where: {
      motivationChannelId: {
        not: null,
      },
    },
  });

  /**
   * Find a random motivation quote from the database.
   */
  const motivationQuoteCount = await prisma.motivationQuote.count();
  const skip = Math.floor(Math.random() * motivationQuoteCount);
  const motivationQuote = await prisma.motivationQuote.findMany({
    skip,
    take: 1,
  });

  if (!motivationQuote[0]) {
    logger.error("Worker", "No motivation quote found in the database");
    return;
  }

  /**
   * Get the user who added the motivation quote.
   */
  let addedBy;
  try {
    addedBy = await client.users.fetch(motivationQuote[0].addedBy);
  } catch (error) {
    logger.error("Worker", "Failed to fetch user who added the quote", error, {
      userId: motivationQuote[0].addedBy,
      quoteId: motivationQuote[0].id,
    });
    addedBy = null;
  }

  guilds.map(async (g: Guild) => {
    /**
     * This is to keep typescript happy. As in the query above.
     * We are filtering out guilds that don't have the motivation channel set.
     */
    if (!g.motivationChannelId) {
      logger.warn("Worker", "Guild does not have a motivation channel set", {
        guildId: g.guildId,
      });
      return;
    }
    /**
     * Get the motivation channel from the guild.
     */
    const motivationChannel = client.channels.cache.get(
      g.motivationChannelId
    ) as TextChannel;

    /**
     * Create a custom embed for the motivation message.
     */

    const motivationEmbed = new EmbedBuilder()
      .setColor(0xfadb7f)
      .setTitle("Motivation quote of the day 📅")
      .setDescription(
        `**"${motivationQuote[0].quote}"**\n by ${motivationQuote[0].author}`
      )
      .setAuthor({
        name: addedBy ? addedBy.username : "Unknown User",
        url: addedBy ? addedBy.displayAvatarURL() : undefined,
        iconURL: addedBy ? addedBy.displayAvatarURL() : undefined,
      })
      .setFooter({
        text: "Powered by MrDemonWolf, Inc.",
        iconURL: client.user?.displayAvatarURL(),
      });

    /**
     * Send the motivation message.
     */
    motivationChannel.send({ embeds: [motivationEmbed] });
  });
  posthog.capture({
    distinctId: "motivation-job",
    event: "motivation job executed",
    properties: {
      environment: process.env.NODE_ENV,
      quote: motivationQuote[0].id,
    },
  });
}
