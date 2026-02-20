import {
  Client,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";


import logger from "../utils/logger.js";
import { prisma } from "../database/index.js";
import env from "../utils/env.js";
import posthog from "../utils/posthog.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("suggestion")
  .setDescription(
    "Make a quote suggestion which will be reviewed by the owner of the bot"
  )
  .addStringOption((option) =>
    option
      .setName("quote")
      .setDescription("The quote to be suggested")
      .setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName("author")
      .setDescription("The author of the quote")
      .setRequired(true)
  );

export async function execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    logger.commands.executing(
      "suggestion",
      interaction.user.username,
      interaction.user.id
    );

    const options = interaction.options;

    const quote = options.getString("quote");
    const author = options.getString("author");

    if (!quote) {
      await interaction.reply({
        content: "Please provide a quote",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!author) {
      await interaction.reply({
        content: "Please provide an author",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!interaction.guildId) {
      await interaction.reply({
        content: "This command can only be used in a server",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    /**
     * Get the guild from the database
     * Check if the guild is setup
     * If not, return an error message
     */
    const guild = await prisma.guild.findUnique({
      where: {
        guildId: interaction.guildId,
      },
    });

    if (!guild) {
      await interaction.reply({
        content: "This server is not setup yet. Please setup the bot first.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const newQuote = await prisma.suggestionQuote.create({
      data: {
        quote,
        author,
        addedBy: interaction.user.id,
        status: "Pending",
      },
    });

    await interaction.reply({
      content: "Quote suggestion created owner will review it soon!",
      flags: MessageFlags.Ephemeral,
    });

    /**
     * Send the quote suggestion to the main channel for review
     */
    const embed = new EmbedBuilder()
      .setColor(0xfadb7f)
      .setTitle("New Quote Suggestion")
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .addFields(
        {
          name: "Quote",
          value: quote,
        },
        {
          name: "Quote Author",
          value: author,
        },
        {
          name: "Status",
          value: newQuote.status,
        }
      )
      .setTimestamp()
      .setFooter({
        text: `Created with ID ${newQuote.id}`,
      });

    if (env.MAIN_CHANNEL_ID) {
      const mainChannel = await client.channels.fetch(env.MAIN_CHANNEL_ID);
      if (mainChannel?.isTextBased() && !mainChannel.isDMBased()) {
        await mainChannel.send({ embeds: [embed] });
      }
    }

    logger.commands.success(
      "suggestion",
      interaction.user.username,
      interaction.user.id
    );

    posthog.capture({
      distinctId: interaction.user.id,
      event: "suggestion command used",
      properties: {
        quote,
        author,
        guildId: interaction.guildId,
        environment: process.env["NODE_ENV"],
        userId: interaction.user.id,
        username: interaction.user.username,
      },
    });
  } catch (err) {
    logger.commands.error(
      "suggestion",
      interaction.user.username,
      interaction.user.id,
      err
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "An error occurred while processing your request.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

export default {
  slashCommand,
  execute,
};
