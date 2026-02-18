import { Client, CommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";

import { isUserPermitted } from "../../../utils/permissions.js";
import { prisma } from "../../../database/index.js";
import logger from "../../../utils/logger.js";

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

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) {
      return;
    }

    const [pending, approved, rejected] = await Promise.all([
      prisma.suggestionQuote.count({ where: { status: "Pending" } }),
      prisma.suggestionQuote.count({ where: { status: "Approved" } }),
      prisma.suggestionQuote.count({ where: { status: "Rejected" } }),
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
    logger.error(
      "Discord - Command",
      "Error executing admin suggestion stats command",
      err,
      {
        user: { username: interaction.user.username, id: interaction.user.id },
        command: "admin suggestion stats",
      },
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "An error occurred while processing your request.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
