import { MessageFlags } from "discord.js";

import type { Client, ChatInputCommandInteraction } from "discord.js";

import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { motivationQuotes } from "../../../database/schema.js";
import { announceToMainChannel } from "../../../utils/mainChannel.js";
import { withCommandLogging } from "../../../utils/commandErrors.js";
import { buildBrandedEmbed } from "../../../utils/embedHelpers.js";
import { quoteInputError } from "../../../utils/quoteLimits.js";

export default async function (
  client: Client,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await withCommandLogging("admin quote create", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {
      return;
    }

    // Both options are required in the command schema.
    const quote = interaction.options.getString("quote", true);
    const quoteAuthor = interaction.options.getString("quote_author", true);

    const inputError = quoteInputError(quote, quoteAuthor);
    if (inputError) {
      await interaction.reply({ content: inputError, flags: MessageFlags.Ephemeral });
      return;
    }

    const [newQuote] = await db
      .insert(motivationQuotes)
      .values({
        quote,
        author: quoteAuthor,
        addedBy: interaction.user.id,
      })
      .returning();

    if (!newQuote) {
      return;
    }

    // Reply before the main-channel notification: the DB write is committed,
    // and the announce can outlive the 3-second interaction deadline.
    await interaction.reply({
      content: `Quote created with id: ${newQuote.id}`,
      flags: MessageFlags.Ephemeral,
    });

    const embed = buildBrandedEmbed({
      title: "New Quote Created",
      fields: [
        { name: "Quote", value: newQuote.quote },
        { name: "Author", value: newQuote.author },
      ],
      footer: `Quote ID: ${newQuote.id}`,
      timestamp: true,
    }).setAuthor({
      name: interaction.user.username,
      iconURL: interaction.user.displayAvatarURL(),
    });

    // Best-effort: the quote already exists and the user was told so.
    await announceToMainChannel(
      client,
      { embeds: [embed] },
      "Failed to announce new quote to main channel",
      { quoteId: newQuote.id }
    );
  });
}
