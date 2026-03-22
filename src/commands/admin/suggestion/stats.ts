import { Client, CommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";

import { eq, count } from "drizzle-orm";

import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { suggestionQuotes } from "../../../database/schema.js";
import logger from "../../../utils/logger.js";
import { safeErrorReply } from "../../../utils/commandErrors.js";

export default async function (
  _client: Client,
  interaction: CommandInteraction,
): Promise<void> {
  try {
    logger.commands.executing(
      "admin suggestion stats",
      interaction.user.username,
      interaction.user.id,
    );

    const isAllowed = await isUserPermitted(interaction);

    if (!isAllowed) {
      return;
    }

    const countByStatus = async (status: string) => {
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

    const embed = new EmbedBuilder()
      .setColor(0xfadb7f)
      .setTitle("Suggestion Statistics")
      .addFields(
        { name: "Pending", value: `${pending}`, inline: true },
        { name: "Approved", value: `${approved}`, inline: true },
        { name: "Rejected", value: `${rejected}`, inline: true },
        { name: "Total", value: `${total}`, inline: true },
        { name: "Approval Rate", value: `${approvalRate}%`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "admin suggestion stats",
      interaction.user.username,
      interaction.user.id,
    );
  } catch (err) {
    logger.commands.error(
      "admin suggestion stats",
      interaction.user.username,
      interaction.user.id,
      err,
    );

    await safeErrorReply(interaction);
  }
}
