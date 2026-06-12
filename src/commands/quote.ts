import { SlashCommandBuilder, MessageFlags } from "discord.js";

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

export async function execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
  await withCommandLogging("quote", interaction, async () => {
    const quote = await getRandomMotivationQuote();
    if (!quote) {
      await interaction.reply({
        content: "No motivation quote found. Please try again later!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const addedBy = await resolveQuoteAuthor(client, quote.addedBy);

    await interaction.reply({
      embeds: [buildMotivationEmbed(quote, addedBy, client)],
    });
  });
}

export default { slashCommand, execute };
