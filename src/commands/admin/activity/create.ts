import { Client, CommandInteraction, MessageFlags } from "discord.js";
import consola from "consola";

import type { CommandInteractionOptionResolver } from "discord.js";
import type { DiscordActivityType } from "@prisma/client";

import { info, success, error } from "../../../utils/commandLogger";
import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
) {
  try {
    info("admin activity add", interaction.user.username, interaction.user.id);

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) return;

    const activity = options.getString("activity", true);
    const activityType = options.getString("type", true);
    const activityUrl = options.getString("url");

    if (!activity) return interaction.reply("Please provide an activity");
    if (!activityType) return interaction.reply("Please provide a type");

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

    success(
      "admin activity add",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    error("admin activity add", interaction.user.username, interaction.user.id);
    consola.error({
      message: `[Admin Activity Add Command] Error executing command: ${err}`,
      badge: true,
      timestamp: new Date(),
    });
  }
}
