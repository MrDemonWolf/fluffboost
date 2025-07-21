import { Client, CommandInteraction } from "discord.js";
import { info, success, error } from "../../../utils/commandLogger";
import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";

import type { CommandInteractionOptionResolver } from "discord.js";

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
      return interaction.reply("Activity not found");
    }

    await prisma.discordActivity.delete({
      where: { id: activityId },
    });

    await interaction.reply({
      content: `Activity with ID: ${activityId} has been deleted`,
      ephemeral: true,
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
