import { ActivityType } from "discord.js";

import type { Client } from "discord.js";
import { desc } from "drizzle-orm";

import { db } from "../../database/index.js";
import { discordActivities } from "../../database/schema.js";
import env from "../../utils/env.js";
import logger from "../../utils/logger.js";

// Safe lookup for ActivityType enum with fallback to Playing
const getActivityType = (activityTypeString: string): ActivityType => {
  const activityType =
    ActivityType[activityTypeString as keyof typeof ActivityType];
  return activityType !== undefined ? activityType : ActivityType.Playing;
};

export interface SetActivityDeps {
  db: typeof db;
  env: typeof env;
  logger: typeof logger;
}

export async function setActivityCore(client: Client, { db: _db, env: _env, logger: _logger }: SetActivityDeps) {
  try {
    const defaultActivity = _env.DISCORD_DEFAULT_STATUS;
    const defaultActivityType = _env.DISCORD_DEFAULT_ACTIVITY_TYPE;
    const defaultActivityUrl = _env.DEFAULT_ACTIVITY_URL;

    if (!client.user) {
      return _logger.warn(
        "Worker",
        "Client user is not defined, cannot set activity"
      );
    }
    const randomActivity = async () => {
      const activities = await _db
        .select()
        .from(discordActivities)
        .orderBy(desc(discordActivities.createdAt));

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
      _logger.warn(
        "Worker",
        "No custom discord activity found, using default activity"
      );
      const safeActivityType = getActivityType(defaultActivityType);
      client.user.setActivity(defaultActivity, {
        type: safeActivityType,
        url: defaultActivityUrl,
      });
      _logger.success("Worker", "Activity has been set", {
        activity: defaultActivity,
        type: safeActivityType,
        url: defaultActivityUrl,
      });
      return true;
    }

    const safeActivityType = getActivityType(activity.type);
    client.user.setActivity(activity.activity, {
      type: safeActivityType,
      url: activity.url ? activity.url : undefined,
    });

    _logger.success("Worker", "Activity has been set", {
      activity: activity.activity,
      type: safeActivityType,
    });
    return true;
  } catch (err) {
    _logger.error(
      "Worker",
      "Error setting custom discord activity",
      err
    );
  }
}

export default async (client: Client) => setActivityCore(client, { db, env, logger });
