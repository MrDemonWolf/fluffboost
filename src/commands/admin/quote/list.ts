import type { Client, CommandInteraction } from "discord.js";

import { desc } from "drizzle-orm";

import { withCommandLogging } from "../../../utils/commandErrors.js";
import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { motivationQuotes } from "../../../database/schema.js";
import { replyWithTextFile } from "../../../utils/replyHelpers.js";

export default async function (
  _client: Client,
  interaction: CommandInteraction
): Promise<void> {
  await withCommandLogging("admin quote list", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {return;}

    const quotes = await db
      .select()
      .from(motivationQuotes)
      .orderBy(desc(motivationQuotes.createdAt));

    await replyWithTextFile({
      interaction,
      rows: quotes,
      header: "ID - Quote - Author",
      formatRow: (q) => `${q.id} - ${q.quote} - ${q.author}`,
      filename: "quotes.txt",
      emptyMessage: "No quotes found. Feel free to add some!",
    });
  });
}
