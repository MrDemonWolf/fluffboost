import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import consola from "consola";

import type { Client, CommandInteraction } from "discord.js";

import { info, success, error } from "../utils/commandLogger";
import { prisma } from "../database";
import posthog from "../utils/posthog";

export const slashCommand = new SlashCommandBuilder()
  .setName("quote")
  .setDescription("Get an instant dose of motivation");

export async function execute(client: Client, interaction: CommandInteraction) {
  try {
    info("quote", interaction.user.username, interaction.user.id);

    /**
     * Find a random motivation quote from the database.
     */
    const motivationQuoteCount = await prisma.motivationQuote.count();
    const skip = Math.floor(Math.random() * motivationQuoteCount);
    const motivationQuote = await prisma.motivationQuote.findMany({
      skip,
      take: 1,
    });

    if (!motivationQuote[0])
      return interaction.reply(
        "No motivation quote found.  Please try again later!"
      );

    /**
     * Create a custom embed for the motivation message.
     */
    const addedBy = await client.users.fetch(motivationQuote[0].addedBy);
    if (!addedBy) {
      consola.error({
        message: `[Quote Command] Could not fetch user with ID ${motivationQuote[0].addedBy}`,
        badge: true,
        timestamp: new Date(),
      });
      return interaction.reply(
        "Failed to fetch quote information. Please try again later!"
      );
    }

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
    await interaction.reply({
      embeds: [motivationEmbed],
    });

    success("quote", interaction.user.username, interaction.user.id);

    posthog.capture({
      distinctId: interaction.user.id,
      event: "quote command used",
      properties: {
        quote: motivationQuote[0].id,
        environment: process.env.NODE_ENV,
        userId: interaction.user.id,
        username: interaction.user.username,
      },
    });
  } catch (err) {
    error("quote", interaction.user.username, interaction.user.id);
    consola.error({
      message: `[Quote Command] Error executing command: ${err}`,
      badge: true,
      timestamp: new Date(),
    });
  }
}

export default {
  slashCommand,
  execute,
};
