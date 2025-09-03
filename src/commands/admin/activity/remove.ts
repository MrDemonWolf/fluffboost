import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import logger from "../../../utils/logger";
import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
) {
  try {
    logger.commands.executing(
      "admin activity delete",
      interaction.user.username,
      interaction.user.id
    );

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) {
      return interaction.reply({
        content: "You don't have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const activityId = options.getString("activity_id", true);

    if (!activityId.trim()) {
      return interaction.reply({
        content: "Please provide a valid activity ID",
        flags: MessageFlags.Ephemeral,
      });
    }

    const activity = await prisma.discordActivity.findUnique({
      where: { id: activityId },
    });

    if (!activity) {
      return interaction.reply({
        content: `No activity found with ID: ${activityId}`,
        flags: MessageFlags.Ephemeral,
      });
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
    logger.error("Command", "Error in admin activity delete", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "admin activity delete",
      activityId: options.getString("id"),
    });

    if (!interaction.replied) {
      await interaction.reply({
        content:
          "An error occurred while deleting the activity. Please try again.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
