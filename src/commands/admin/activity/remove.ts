import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import logger from "../../../utils/logger.js";
import { isUserPermitted } from "../../../utils/permissions.js";
import { prisma } from "../../../database/index.js";

export default async function (
  _client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
): Promise<void> {
  try {
    logger.commands.executing(
      "admin activity delete",
      interaction.user.username,
      interaction.user.id
    );

    const isAllowed = await isUserPermitted(interaction);

    if (!isAllowed) {
      return;
    }

    const activityId = options.getString("activity_id", true);

    if (!activityId.trim()) {
      await interaction.reply({
        content: "Please provide a valid activity ID",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const activity = await prisma.discordActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      await interaction.reply({
        content: `No activity found with ID: ${activityId}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await prisma.discordActivity.delete({
      where: { id: activityId },
    });

    await interaction.reply({
      content: `Activity with ID: ${activityId} has been deleted`,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "admin activity delete",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    logger.commands.error(
      "admin activity delete",
      interaction.user.username,
      interaction.user.id,
      err
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content:
          "An error occurred while deleting the activity. Please try again.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
