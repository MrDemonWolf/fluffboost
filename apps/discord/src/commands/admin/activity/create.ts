import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import type { DiscordActivityType } from "../../../database/schema.js";

import { withCommandLogging } from "../../../utils/commandErrors.js";
import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { discordActivities } from "../../../database/schema.js";

export default async function (
  _client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
): Promise<void> {
  await withCommandLogging("admin activity add", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {
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

    const [newActivity] = await db
      .insert(discordActivities)
      .values({
        activity,
        type: activityType as DiscordActivityType,
        url: activityUrl,
      })
      .returning();

    await interaction.reply({
      content: `Activity added with id: ${newActivity?.id}`,
      flags: MessageFlags.Ephemeral,
    });
  });
}
