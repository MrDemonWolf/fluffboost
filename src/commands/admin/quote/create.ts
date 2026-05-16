import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { motivationQuotes } from "../../../database/schema.js";
import { sendToMainChannel } from "../../../utils/mainChannel.js";
import { withCommandLogging } from "../../../utils/commandErrors.js";
import { buildBrandedEmbed } from "../../../utils/embedHelpers.js";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
): Promise<void> {
  await withCommandLogging("admin quote create", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {
      return;
    }

    const quote = options.getString("quote");
    const quoteAuthor = options.getString("quote_author");

    if (!quote) {
      await interaction.reply({
        content: "Please provide a quote",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!quoteAuthor) {
      await interaction.reply({
        content: "Please provide an author",
        flags: MessageFlags.Ephemeral,
      });
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

    await sendToMainChannel(client, { embeds: [embed] });

    await interaction.reply({
      content: `Quote created with id: ${newQuote.id}`,
      flags: MessageFlags.Ephemeral,
    });
  });
}
