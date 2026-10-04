import { MessageFlags } from "discord.js";
import type { Client, CommandInteraction, CommandInteractionOptionResolver } from "discord.js";

import { eq, desc } from "drizzle-orm";

import { withCommandLogging } from "../../../utils/commandErrors.js";
import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { suggestionQuotes } from "../../../database/schema.js";
import type { SuggestionStatus } from "../../../database/schema.js";
import { replyWithTextFile } from "../../../utils/replyHelpers.js";

const VALID_STATUSES: SuggestionStatus[] = ["Pending", "Approved", "Rejected"];
const PAGE_SIZE = 500;

export default async function (
  _client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver,
): Promise<void> {
  await withCommandLogging("admin suggestion list", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {return;}

    const status = options.getString("status");
    if (status && !(VALID_STATUSES as string[]).includes(status)) {
      await interaction.reply({
        content: `Invalid status: ${status}. Must be one of: ${VALID_STATUSES.join(", ")}.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const validStatus = status ? (status as SuggestionStatus) : null;
    const requestedPage = options.getInteger("page");
    const page = requestedPage && requestedPage > 0 ? requestedPage : 1;

    const baseQuery = db
      .select()
      .from(suggestionQuotes)
      .orderBy(desc(suggestionQuotes.createdAt), desc(suggestionQuotes.id));
    const pageQuery = validStatus
      ? baseQuery.where(eq(suggestionQuotes.status, validStatus))
      : baseQuery;
    const pageRows = await pageQuery
      .limit(PAGE_SIZE + 1)
      .offset((page - 1) * PAGE_SIZE);
    const hasMore = pageRows.length > PAGE_SIZE;
    const suggestions = hasMore ? pageRows.slice(0, PAGE_SIZE) : pageRows;

    await replyWithTextFile({
      interaction,
      rows: suggestions,
      header: `ID - Quote - Author - Status - Submitted By\nPage ${page} (up to ${PAGE_SIZE} suggestions${hasMore ? `; more results on page ${page + 1}` : ""})`,
      formatRow: (s) => `${s.id} - ${s.quote} - ${s.author} - ${s.status} - ${s.addedBy}`,
      filename: "suggestions.txt",
      emptyMessage: validStatus
        ? `No suggestions found with status: ${validStatus} on page ${page}.`
        : `No suggestions found on page ${page}.`,
    });
  });
}
