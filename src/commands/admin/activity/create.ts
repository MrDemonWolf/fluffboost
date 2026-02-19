import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";
import type { DiscordActivityType } from "../../../generated/prisma/client.js";

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
      "admin activity add",
      interaction.user.username,
      interaction.user.id
    );

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) {
      return;
    }

    const activity = options.getString("activity", true);
    const activityType = options.getString("type", true);
    const activityUrl = options.getString("url");

    if (!activity.trim()) {
      await interaction.reply({
        content: "Please provide an activity",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    if (!activityType.trim()) {
      await interaction.reply({
        content: "Please provide a type",
        flags: MessageFlags.Ephemeral,
      });
      return;
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
      interaction.user.id
    );
  } catch (err) {
    logger.commands.error(
      "admin activity add",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error(
      "Discord - Command",
      "Error executing admin activity add command",
      err,
      {
        user: { username: interaction.user.username, id: interaction.user.id },
        command: "admin activity add",
      }
    );

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "An error occurred while processing your request.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
