import type { Client, CommandInteraction, CommandInteractionOptionResolver } from "discord.js";

import { eq, desc } from "drizzle-orm";

import { withCommandLogging } from "../../../utils/commandErrors.js";
import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { suggestionQuotes } from "../../../database/schema.js";
import type { SuggestionStatus } from "../../../database/schema.js";
import { replyWithTextFile } from "../../../utils/replyHelpers.js";

const VALID_STATUSES: SuggestionStatus[] = ["Pending", "Approved", "Rejected"];

export default async function (
  _client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver,
): Promise<void> {
  await withCommandLogging("admin suggestion list", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {return;}

    const status = options.getString("status");
    const validStatus = status && (VALID_STATUSES as string[]).includes(status)
      ? (status as SuggestionStatus)
      : null;

    const baseQuery = db.select().from(suggestionQuotes).orderBy(desc(suggestionQuotes.createdAt));
    const suggestions = validStatus
      ? await baseQuery.where(eq(suggestionQuotes.status, validStatus))
      : await baseQuery;

    await replyWithTextFile({
      interaction,
      rows: suggestions,
      header: "ID - Quote - Author - Status - Submitted By",
      formatRow: (s) => `${s.id} - ${s.quote} - ${s.author} - ${s.status} - ${s.addedBy}`,
      filename: "suggestions.txt",
      emptyMessage: status ? `No suggestions found with status: ${status}` : "No suggestions found.",
    });
  });
}
