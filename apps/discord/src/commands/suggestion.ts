import {
  Client,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  MessageFlags,
} from "discord.js";

import { eq } from "drizzle-orm";

import { db } from "../database/index.js";
import { guilds, suggestionQuotes } from "../database/schema.js";
import { announceToMainChannel } from "../utils/mainChannel.js";
import { withCommandLogging } from "../utils/commandErrors.js";
import { requireGuildId } from "../utils/permissions.js";
import { buildBrandedEmbed } from "../utils/embedHelpers.js";

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
  await withCommandLogging("suggestion", interaction, async () => {
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
    const guildId = await requireGuildId(interaction);
    if (!guildId) {
      return;
    }

    /**
     * Get the guild from the database
     * Check if the guild is setup
     * If not, return an error message
     */
    const [guild] = await db
      .select()
      .from(guilds)
      .where(eq(guilds.guildId, guildId))
      .limit(1);

    if (!guild) {
      await interaction.reply({
        content: "This server is not setup yet. Please setup the bot first.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const [newQuote] = await db
      .insert(suggestionQuotes)
      .values({
        quote,
        author,
        addedBy: interaction.user.id,
        status: "Pending",
      })
      .returning();

    await interaction.reply({
      content: "Quote suggestion created owner will review it soon!",
      flags: MessageFlags.Ephemeral,
    });

    if (!newQuote) {
      return;
    }

    /**
     * Send the quote suggestion to the main channel for review
     */
    const embed = buildBrandedEmbed({
      title: "New Quote Suggestion",
      fields: [
        { name: "Quote", value: quote },
        { name: "Quote Author", value: author },
        { name: "Status", value: newQuote.status },
      ],
      footer: `Created with ID ${newQuote.id}`,
      timestamp: true,
    }).setAuthor({
      name: interaction.user.username,
      iconURL: interaction.user.displayAvatarURL(),
    });

    // Best-effort: the suggestion is saved and the user was told so.
    await announceToMainChannel(
      client,
      { embeds: [embed] },
      "Failed to announce suggestion to main channel",
      { suggestionId: newQuote.id }
    );
  });
}

export default {
  slashCommand,
  execute,
};
