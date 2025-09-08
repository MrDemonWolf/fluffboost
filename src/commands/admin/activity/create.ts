import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";
import type { DiscordActivityType } from "@prisma/client";

import logger from "../../../utils/logger";
import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver,
) {
  try {
    logger.commands.executing(
      "admin activity add",
      interaction.user.username,
      interaction.user.id,
    );

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) {
return;
}

    const activity = options.getString("activity", true);
    const activityType = options.getString("type", true);
    const activityUrl = options.getString("url");

    if (!activity) {
return interaction.reply("Please provide an activity");
}
    if (!activityType) {
return interaction.reply("Please provide a type");
}

    const newActivity = await prisma.discordActivity.create({
      data: {
        activity,
        type: activityType as DiscordActivityType,
        url: activityUrl,
      },
    });

    await interaction.reply({
      content: `Activity added with id: ${newActivity.id}`,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "admin activity add",
      interaction.user.username,
      interaction.user.id,
    );
  } catch (err) {
    logger.commands.error(
      "admin activity add",
      interaction.user.username,
      interaction.user.id,
      err,
    );
    logger.error("Discord - Command", "Error executing admin activity add command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "admin activity add",
    });
  }
}
