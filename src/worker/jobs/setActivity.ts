import { ActivityType } from "discord.js";

import type { Client } from "discord.js";

import { prisma } from "../../database";
import env from "../../utils/env";
import logger from "../../utils/logger";

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
      logger.warn(
        "Discord",
        "No custom discord activity found, using default activity",
      );
      return client.user?.setActivity(defaultActivity, {
        type: ActivityType[defaultActivityType],
        url: defaultActivityUrl,
      });
    }

    client.user?.setActivity(activity.activity, {
      type: ActivityType[activity.type],
      url: activity.url || undefined,
    });

    logger.success("Discord", "Activity has been set", {
      activity: activity.activity,
      type: activity.type,
    });
  } catch (err) {
    logger.error("Discord", "Error setting custom discord activity", err);
  }
};
