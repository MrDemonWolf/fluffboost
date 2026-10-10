import { MessageFlags } from "discord.js";

import type { Client, ChatInputCommandInteraction } from "discord.js";

import { eq } from "drizzle-orm";

import { withCommandLogging } from "../../../utils/commandErrors.js";
import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { discordActivities } from "../../../database/schema.js";
import { isUuid } from "../../../utils/quoteLimits.js";

export default async function (
  _client: Client,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await withCommandLogging("admin activity delete", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {
      return;
    }

    const activityId = interaction.options.getString("activity_id", true).trim();

    // Single atomic statement: concurrent removes cannot both report success.
    const [deleted] = isUuid(activityId)
      ? await db
        .delete(discordActivities)
        .where(eq(discordActivities.id, activityId))
        .returning({ id: discordActivities.id })
      : [];

    if (!deleted) {
      await interaction.reply({
        content: `No activity found with ID: ${activityId}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      content: `Activity with ID: ${activityId} has been deleted`,
      flags: MessageFlags.Ephemeral,
    });
  });
}
