import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import { info, success, error } from "../../../utils/commandLogger";
import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
) {
  try {
    info(
      "admin activity delete",
      interaction.user.username,
      interaction.user.id
    );

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) return;

    const activityId = options.getString("activity_id", true);

    if (!activityId) return interaction.reply("Please provide an activity ID");

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

    success(
      "admin activity delete",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    error(
      "admin activity delete",
      interaction.user.username,
      interaction.user.id
    );
    console.log(err);
  }
}
