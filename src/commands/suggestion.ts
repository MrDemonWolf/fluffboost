import {
  Client,
  CommandInteraction,
  TextChannel,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import type { CommandInteractionOptionResolver } from "discord.js";
import { info, success, error } from "../utils/commandLogger";
import { prisma } from "../database";
import { env } from "../utils/env";

export const slashCommand = new SlashCommandBuilder()
  .setName("suggestion")
  .setDescription(
    "Make a quote suggestion which will be reviewed by a the owner of the bot"
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

export async function execute(client: Client, interaction: CommandInteraction) {
  try {
    info("suggestion", interaction.user.username, interaction.user.id);

    const options = interaction.options as CommandInteractionOptionResolver;

    const quote = options.getString("quote");
    const author = options.getString("author");

    if (!quote) return interaction.reply("Please provide a quote");
    if (!author) return interaction.reply("Please provide an author");
    if (!interaction.guildId)
      return interaction.reply("This command can only be used in a server");

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
    if (!guild)
      return interaction.reply(
        "This server is not setup yet. Please setup the bot first."
      );

    const newQuote = await prisma.suggestionQuote.create({
      data: {
        quote,
        author,
        addedBy: interaction.user.id,
        status: "Pending",
        guildId: guild.id,
      },
    });

    interaction.reply({
      content: `Quote suggestion created owner will review it soon!`,
      ephemeral: true,
    });

    /**
     * Send the quote suggestion to the main channel for review
     */
    const mainChannel = client.channels.cache.get(
      env.MAIN_CHANNEL_ID as string
    ) as TextChannel;

    const embed = new EmbedBuilder()
      .setColor(0xfadb7f)
      .setTitle("New Quote Suggestion")
      .setDescription(`Quote suggestion by ${interaction.user.username}`)
      .addFields(
        {
          name: "Quote",
          value: quote,
          inline: true,
        },
        {
          name: "Author",
          value: author,
          inline: true,
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

    mainChannel?.send({
      embeds: [embed],
      content: `<@${interaction.user.id}>`,
    });

    success("suggestion", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("suggestion", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}

export default {
  slashCommand,
  execute,
};
