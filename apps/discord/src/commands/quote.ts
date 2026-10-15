/** `/quote`: posts a random motivation quote from the library, publicly, on demand. */
import { SlashCommandBuilder } from "discord.js";

import type { Client, ChatInputCommandInteraction } from "discord.js";

import { withCommandLogging } from "../utils/commandErrors.js";
import {
  buildMotivationEmbed,
  getRandomMotivationQuote,
  resolveQuoteAuthor,
} from "./quoteDeps.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("quote")
  .setDescription("Get an instant dose of motivation");

/**
 * Defers, then edits in the quote embed (credited to the user who added it),
 * or a fallback message when the library is empty. Does not touch the guild's
 * delivery schedule.
 */
export async function execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
  await withCommandLogging("quote", interaction, async () => {
    await interaction.deferReply();
    const quote = await getRandomMotivationQuote();
    if (!quote) {
      await interaction.editReply({
        content: "No motivation quote found. Please try again later!",
      });
      return;
    }

    const addedBy = await resolveQuoteAuthor(client, quote.addedBy);

    await interaction.editReply({
      embeds: [buildMotivationEmbed(quote, addedBy, client)],
    });
  });
}

export default { slashCommand, execute };
