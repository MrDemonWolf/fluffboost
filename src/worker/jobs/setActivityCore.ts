import { ActivityType } from "discord.js";

import type { Client } from "discord.js";
import { desc } from "drizzle-orm";

import { db } from "../../database/index.js";
import { discordActivities } from "../../database/schema.js";
import env from "../../utils/env.js";
import logger from "../../utils/logger.js";

const getActivityType = (activityTypeString: string): ActivityType => {
  const activityType = ActivityType[activityTypeString as keyof typeof ActivityType];
  return activityType !== undefined ? activityType : ActivityType.Playing;
};

export interface SetActivityDeps {
  db: typeof db;
  env: typeof env;
  logger: typeof logger;
}

/**
 * Apply a presence on every shard. Presence is per-shard gateway state and
 * each queue tick is consumed by a single shard's worker, so a plain
 * client.user.setActivity() would leave every other shard's status stale.
 */
async function applyActivity(
  client: Client,
  name: string,
  type: ActivityType,
  url: string | undefined
): Promise<void> {
  if (client.shard) {
    await client.shard.broadcastEval(
      (c, ctx) => {
        c.user?.setActivity(ctx.name, { type: ctx.type, url: ctx.url ?? undefined });
      },
      { context: { name, type, url: url ?? null } }
    );
  } else {
    client.user?.setActivity(name, { type, url });
  }
}

export async function setActivityCore(
  client: Client,
  { db: _db, env: _env, logger: _logger }: SetActivityDeps
): Promise<boolean> {
  try {
    const defaultActivity = _env.DISCORD_DEFAULT_STATUS;
    const defaultActivityType = _env.DISCORD_DEFAULT_ACTIVITY_TYPE;
    const defaultActivityUrl = _env.DEFAULT_ACTIVITY_URL;

    if (!client.user) {
      _logger.warn("Worker", "Client user is not defined, cannot set activity");
      return false;
    }

    const activities = await _db
      .select()
      .from(discordActivities)
      .orderBy(desc(discordActivities.createdAt));

    if (activities.length === 0) {
      _logger.warn("Worker", "No custom discord activity found, using default activity");
      const safeActivityType = getActivityType(defaultActivityType);
      await applyActivity(client, defaultActivity, safeActivityType, defaultActivityUrl);
      _logger.success("Worker", "Activity has been set", {
        activity: defaultActivity,
        type: safeActivityType,
        url: defaultActivityUrl,
      });
      return true;
    }

    activities.push({
      id: "default",
      activity: defaultActivity,
      type: defaultActivityType,
      url: defaultActivityUrl ? defaultActivityUrl : null,
      createdAt: new Date(),
    });

    const randomIndex = Math.floor(Math.random() * activities.length);
    const activity = activities[randomIndex];
    if (!activity) {
      return false;
    }

    const safeActivityType = getActivityType(activity.type);
    await applyActivity(client, activity.activity, safeActivityType, activity.url ?? undefined);

    _logger.success("Worker", "Activity has been set", {
      activity: activity.activity,
      type: safeActivityType,
    });
    return true;
  } catch (err) {
    // Rethrow so the BullMQ job is marked failed instead of silently
    // reporting completed on every error.
    _logger.error("Worker", "Error setting custom discord activity", err);
    throw err;
  }
}
