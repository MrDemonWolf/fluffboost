import { Client, CommandInteraction, MessageFlags } from "discord.js";

import { desc } from "drizzle-orm";

import type { DiscordActivity } from "../../../database/schema.js";

import logger from "../../../utils/logger.js";
import { safeErrorReply } from "../../../utils/commandErrors.js";
import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { discordActivities } from "../../../database/schema.js";

export default async function (
  _client: Client,
  interaction: CommandInteraction
): Promise<void> {
  try {
    logger.commands.executing(
      "admin activity list",
      interaction.user.username,
      interaction.user.id
    );

    const isAllowed = await isUserPermitted(interaction);

    if (!isAllowed) {
      return;
    }

    const activities = await db
      .select()
      .from(discordActivities)
      .orderBy(desc(discordActivities.createdAt));

    if (activities.length === 0) {
      await interaction.reply({
        content: "No activities found at the moment. Feel free to add some!",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let text = "ID - Activity - Type - URL\n";
    activities.forEach((activity: DiscordActivity) => {
      text += `${activity.id} - ${activity.activity} - ${activity.type} - ${
        activity.url || "N/A"
      }\n`;
    });

    await interaction.reply({
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

    await safeErrorReply(interaction);
  }
}
