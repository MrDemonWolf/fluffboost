import consola from "consola";
import { TextChannel, EmbedBuilder } from "discord.js";

import { prisma } from "../../database";
import client from "../../bot";
import type { Guild } from "@prisma/client";
import posthog from "../../utils/posthog";

export default async function sendMotivation() {
  /**
   * Get all guilds from the database that have the motivation channel set.
   */
  const guilds = await prisma.guild.findMany({
    where: {
      motivationChannel: {
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

  if (!motivationQuote[0]) return consola.error("No motivation quote found");

  /**
   * Get the user who added the motivation quote.
   */
  const addedBy = await client.users.fetch(motivationQuote[0].addedBy);

  if (!addedBy) return "Uknown User";

  guilds.map(async (g: Guild) => {
    /**
     * This is to keep typescript happy. As in the query above.
     * We are filtering out guilds that don't have the motivation channel set.
     */
    if (!g.motivationChannel) {
      return consola.error("No motivation channel set for guild.");
    }
    /**
     * Get the motivation channel from the guild.
     */
    const motivationChannel = client.channels.cache.get(
      g.motivationChannel
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
        name: addedBy.username,
        url: addedBy.displayAvatarURL(),
        iconURL: addedBy.displayAvatarURL(),
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
