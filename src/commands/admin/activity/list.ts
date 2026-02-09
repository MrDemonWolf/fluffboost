import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { DiscordActivity } from "../../../generated/prisma/client.js";

import logger from "../../../utils/logger.js";
import { isUserPermitted } from "../../../utils/permissions.js";
import { prisma } from "../../../database/index.js";

export default async function (
  _client: Client,
  interaction: CommandInteraction
): Promise<any> {
  try {
    logger.commands.executing(
      "admin activity list",
      interaction.user.username,
      interaction.user.id
    );

    const isAllowed = isUserPermitted(interaction);

    if (!isAllowed) {
      return;
    }

    const activities = await prisma.discordActivity.findMany();

    if (activities.length === 0) {
      return interaction.reply({
        content: "No activities found at the moment. Feel free to add some!",
        flags: MessageFlags.Ephemeral,
      });
    }

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

    logger.commands.success(
      "admin activity list",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    logger.commands.error(
      "admin activity list",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error("Discord - Command", "Error in admin activity list", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "admin activity list",
    });
  }
  return undefined;
}
