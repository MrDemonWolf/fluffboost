import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { DiscordActivity } from "@prisma/client";

import { info, success, error } from "../../../utils/commandLogger";
import { isUserPermitted } from "../../../utils/permissions";
import { prisma } from "../../../database";

export default async function (
  client: Client,
  interaction: CommandInteraction
) {
  try {
    info("admin activity list", interaction.user.username, interaction.user.id);

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) return;

    const activities = await prisma.discordActivity.findMany();

    if (activities.length === 0)
      return interaction.reply({
        content: "No activities found at the moment. Feel free to add some!",
        flags: MessageFlags.Ephemeral,
      });

    let text = "ID - Activity - Type - URL\n";
    activities.forEach((activity: DiscordActivity) => {
      text += `${activity.id} - ${activity.activity} - ${activity.type} - ${
        activity.url || "N/A"
      }\n`;
    });

    interaction.reply({
      files: [
        {
          attachment: Buffer.from(text),
          name: "activities.txt",
        },
      ],
    });

    success(
      "admin activity list",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    error(
      "admin activity list",
      interaction.user.username,
      interaction.user.id
    );
    console.log(err);
  }
}
