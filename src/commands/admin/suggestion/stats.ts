import { Client, CommandInteraction, MessageFlags } from "discord.js";

import { eq, count } from "drizzle-orm";

import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { suggestionQuotes } from "../../../database/schema.js";
import type { SuggestionStatus } from "../../../database/schema.js";
import { withCommandLogging } from "../../../utils/commandErrors.js";
import { buildBrandedEmbed } from "../../../utils/embedHelpers.js";

export default async function (
  _client: Client,
  interaction: CommandInteraction,
): Promise<void> {
  await withCommandLogging("admin suggestion stats", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {
      return;
    }

    const countByStatus = async (status: SuggestionStatus) => {
      const [result] = await db
        .select({ value: count() })
        .from(suggestionQuotes)
        .where(eq(suggestionQuotes.status, status));
      return result?.value ?? 0;
    };

    const [pending, approved, rejected] = await Promise.all([
      countByStatus("Pending"),
      countByStatus("Approved"),
      countByStatus("Rejected"),
    ]);

    const total = pending + approved + rejected;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    const embed = buildBrandedEmbed({
      title: "Suggestion Statistics",
      fields: [
        { name: "Pending", value: `${pending}`, inline: true },
        { name: "Approved", value: `${approved}`, inline: true },
        { name: "Rejected", value: `${rejected}`, inline: true },
        { name: "Total", value: `${total}`, inline: true },
        { name: "Approval Rate", value: `${approvalRate}%`, inline: true },
      ],
      timestamp: true,
    });

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  });
}
