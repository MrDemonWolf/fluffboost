import { EmbedBuilder } from "discord.js";
import type { Client } from "discord.js";

import { prisma } from "../../database/index.js";
import { isGuildDueForMotivation } from "../../utils/scheduleEvaluator.js";
import posthog from "../../utils/posthog.js";
import logger from "../../utils/logger.js";

export default async function sendMotivation(client: Client) {
  const guilds = await prisma.guild.findMany({
    where: {
      motivationChannelId: {
        not: null,
      },
    },
  });

  if (guilds.length === 0) {
    return;
  }

  // Filter to only guilds that are due for a motivation quote right now
  const dueGuilds = guilds.filter((g) => isGuildDueForMotivation(g));

  if (dueGuilds.length === 0) {
    return;
  }

  logger.info("Worker", `${dueGuilds.length} guild(s) due for motivation out of ${guilds.length} total`);

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

  const motivationEmbed = new EmbedBuilder()
    .setColor(0xfadb7f)
    .setTitle("Motivation quote of the day \u{1F4C5}")
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

  const results = await Promise.allSettled(
    dueGuilds.map(async (g) => {
      if (!g.motivationChannelId) {
        return;
      }

      const channel = await client.channels.fetch(g.motivationChannelId);

      if (!channel || !channel.isTextBased() || channel.isDMBased()) {
        logger.warn("Worker", "Motivation channel is not a valid text channel", {
          guildId: g.guildId,
          channelId: g.motivationChannelId,
        });
        return;
      }

      await channel.send({ embeds: [motivationEmbed] });

      // Update lastMotivationSentAt after successful send
      await prisma.guild.update({
        where: { guildId: g.guildId },
        data: { lastMotivationSentAt: new Date() },
      });
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  for (const result of results) {
    if (result.status === "rejected") {
      logger.error("Worker", "Failed to send motivation to a guild", result.reason);
    }
  }

  logger.success("Worker", `Motivation sent to ${sent} guild(s), ${failed} failed`);

  posthog.capture({
    distinctId: "motivation-job",
    event: "motivation job executed",
    properties: {
      environment: process.env["NODE_ENV"],
      quote: motivationQuote[0].id,
      sent,
      failed,
      total: dueGuilds.length,
    },
  });
}
