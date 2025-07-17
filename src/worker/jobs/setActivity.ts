import { ActivityType } from "discord.js";
import type { Client } from "discord.js";
import { env } from "../../utils/env";
import { prisma } from "../../database";

import consola from "consola";
import { json } from "stream/consumers";

export default async (client: Client) => {
  try {
    const defaultActivity = env.DISCORD_DEFAULT_STATUS;
    const defaultActivityType = env.DISCORD_DEFAULT_ACTIVITY_TYPE;
    const defaultActivityUrl = env.DEFAULT_ACTIVITY_URL;

    const randomActivity = async () => {
      const activities = await prisma.discordActivity.findMany();

      if (activities.length === 0) {
        return null;
      }

      activities.push({
        id: "default",
        activity: defaultActivity,
        type: defaultActivityType,
        url: defaultActivityUrl ? defaultActivityUrl : null,
        createdAt: new Date(),
      });

      const randomIndex = Math.floor(Math.random() * activities.length);

      return activities[randomIndex];
    };

    const activity = await randomActivity();

    if (!activity) {
      consola.warn("No activity found, using default activity.");
      return client.user?.setActivity(defaultActivity, {
        type: ActivityType[defaultActivityType],
        url: defaultActivityUrl,
      });
    }

    client.user?.setActivity(activity.activity, {
      type: ActivityType[activity.type],
      url: activity.url || undefined,
    });

    consola.success({
      message: "Discord has been activity set",
      badge: true,
    });
  } catch (err) {
    consola.error({
      message: `Error setting custom discord activity: ${err}`,
      badge: true,
    });
  }
};
