import { Client, CommandInteraction, MessageFlags } from "discord.js";

import type { CommandInteractionOptionResolver } from "discord.js";

import { eq } from "drizzle-orm";

import { withCommandLogging } from "../../../utils/commandErrors.js";
import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { discordActivities } from "../../../database/schema.js";

export default async function (
  _client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
): Promise<void> {
  await withCommandLogging("admin activity delete", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {
      return;
    }

    const activityId = options.getString("activity_id", true);

    if (!activityId.trim()) {
      await interaction.reply({
        content: "Please provide a valid activity ID",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const [activity] = await db
      .select()
      .from(discordActivities)
      .where(eq(discordActivities.id, activityId))
      .limit(1);

    if (!activity) {
      await interaction.reply({
        content: `No activity found with ID: ${activityId}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await db.delete(discordActivities).where(eq(discordActivities.id, activityId));

    await interaction.reply({
      content: `Activity with ID: ${activityId} has been deleted`,
      flags: MessageFlags.Ephemeral,
    });
  });
}
