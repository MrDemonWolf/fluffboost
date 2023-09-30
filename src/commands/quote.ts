import { SlashCommandBuilder } from "discord.js";
import { EmbedBuilder } from "discord.js";
import consola from "consola";

import { info, success, error } from "../utils/commandLogger";
import { prisma } from "../database";

import type { Client, CommandInteraction } from "discord.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("quote")
  .setDescription("Get a random quote");

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

    /**
     * Create a custom embed for the motivation message.
     */
    const addedBy = await client.users.fetch(motivationQuote[0].addedBy);
    if (!addedBy) return consola.error("No user found");

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
  } catch (err) {
    error("quote", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}

export default {
  slashCommand,
  execute,
};
