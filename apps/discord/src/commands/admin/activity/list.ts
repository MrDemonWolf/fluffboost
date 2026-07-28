import type { Client, CommandInteraction } from "discord.js";

import { desc } from "drizzle-orm";

import { withCommandLogging } from "../../../utils/commandErrors.js";
import { isUserPermitted } from "../../../utils/permissions.js";
import { db } from "../../../database/index.js";
import { discordActivities } from "../../../database/schema.js";
import { replyWithTextFile } from "../../../utils/replyHelpers.js";

export default async function (
  _client: Client,
  interaction: CommandInteraction
): Promise<void> {
  await withCommandLogging("admin activity list", interaction, async () => {
    if (!(await isUserPermitted(interaction))) {return;}

    const activities = await db
      .select()
      .from(discordActivities)
      .orderBy(desc(discordActivities.createdAt));

    await replyWithTextFile({
      interaction,
      rows: activities,
      header: "ID - Activity - Type - URL",
      formatRow: (a) => `${a.id} - ${a.activity} - ${a.type} - ${a.url || "N/A"}`,
      filename: "activities.txt",
      emptyMessage: "No activities found at the moment. Feel free to add some!",
      ephemeral: false,
    });
  });
}
