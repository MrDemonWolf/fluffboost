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

    if (!client.user) {
      return logger.warn(
        "Discord - Activity",
        "Client user is not defined, cannot set activity"
      );
    }
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
        "Discord - Activity",
        "No custom discord activity found, using default activity"
      );
      return client.user.setActivity(defaultActivity, {
        type: ActivityType[defaultActivityType],
        url: defaultActivityUrl,
      });
    }

    client.user.setActivity(activity.activity, {
      type: ActivityType[activity.type],
      url: activity.url ? activity.url : undefined,
    });

    logger.success("Discord - Activity", "Activity has been set", {
      activity: activity.activity,
      type: activity.type,
    });
    return true;
  } catch (err) {
    logger.error(
      "Discord - Activity",
      "Error setting custom discord activity",
      err
    );
  }
};
