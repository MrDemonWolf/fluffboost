import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

import type { Client, ChatInputCommandInteraction } from "discord.js";

import { count } from "drizzle-orm";

import logger from "../utils/logger.js";
import { safeErrorReply } from "../utils/commandErrors.js";
import { db } from "../database/index.js";
import { motivationQuotes } from "../database/schema.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("quote")
  .setDescription("Get an instant dose of motivation");

export async function execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    logger.commands.executing(
      "quote",
      interaction.user.username,
      interaction.user.id
    );

    /**
     * Find a random motivation quote from the database.
     */
    const [countResult] = await db.select({ value: count() }).from(motivationQuotes);
    const motivationQuoteCount = countResult?.value ?? 0;
    const skip = Math.floor(Math.random() * motivationQuoteCount);
    const motivationQuote = await db.select().from(motivationQuotes).offset(skip).limit(1);

    if (!motivationQuote[0]) {
      await interaction.reply(
        "No motivation quote found.  Please try again later!"
      );
      return;
    }

    /**
     * Create a custom embed for the motivation message.
     */
    const addedBy = await client.users.fetch(motivationQuote[0].addedBy);
    if (!addedBy) {
      logger.error(
        "Command",
        "Could not fetch user for quote",
        new Error(`User ID not found: ${motivationQuote[0].addedBy}`),
        {
          userId: motivationQuote[0].addedBy,
          command: "quote",
        }
      );
      await interaction.reply(
        "Failed to fetch quote information. Please try again later!"
      );
      return;
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

    logger.commands.success(
      "quote",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    logger.commands.error(
      "quote",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error("Discord - Command", "Error executing quote command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "quote",
    });

    await safeErrorReply(interaction);
  }
}

export default {
  slashCommand,
  execute,
};
