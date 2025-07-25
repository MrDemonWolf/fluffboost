import { Client, CommandInteraction, TextChannel } from "discord.js";
import { info, success, error } from "../../../utils/commandLogger";
import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";

import type { CommandInteractionOptionResolver } from "discord.js";
import type { DiscordActivityType } from "@prisma/client";

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
      ephemeral: true,
    });
    success(
      "admin activity add",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    error("admin activity add", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}
