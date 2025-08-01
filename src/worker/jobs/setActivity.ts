import { ActivityType } from "discord.js";

import type { Client } from "discord.js";

import { prisma } from "../../database";
import env from "../../utils/env";

import consola from "consola";

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
      consola.warn({
        message:
          "[Discord] No custom discord activity found, using default activity.",
        badge: true,
        timestamp: new Date(),
      });
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
      message: "[Discord] Activity has been set",
      badge: true,
      timestamp: new Date(),
    });
  } catch (err) {
    consola.error({
      message: `[Discord] Error setting custom discord activity: ${err}`,
      badge: true,
      timestamp: new Date(),
    });
  }
};
