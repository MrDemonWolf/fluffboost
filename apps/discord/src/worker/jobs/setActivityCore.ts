import { ActivityType } from "discord.js";

import type { Client } from "discord.js";
import { desc } from "drizzle-orm";

// Type-only imports keep this module evaluable without env/db side effects —
// tests import it directly and inject every dependency.
import type { db } from "../../database/index.js";
import { discordActivities } from "../../database/schema.js";
import { withTimeout } from "../../utils/async.js";
import type { DiscordActivityType } from "../../database/schema.js";
import type env from "../../utils/env.js";
import type logger from "../../utils/logger.js";

// Exhaustive: a new DiscordActivityType member fails to compile until mapped.
const ACTIVITY_TYPES: Record<DiscordActivityType, ActivityType> = {
  Custom: ActivityType.Custom,
  Listening: ActivityType.Listening,
  Streaming: ActivityType.Streaming,
  Playing: ActivityType.Playing,
};

const getActivityType = (activityType: DiscordActivityType): ActivityType =>
  ACTIVITY_TYPES[activityType] ?? ActivityType.Playing;

/**
 * Upper bound on the cross-shard presence broadcast. discord.js never settles
 * a pending broadcastEval when a sibling shard dies mid-eval, which would pin
 * this job (and a worker concurrency slot) forever; failing lets the next
 * rotation retry.
 */
export const BROADCAST_TIMEOUT_MS = 10_000;

export interface SetActivityDeps {
  db: typeof db;
  env: typeof env;
  logger: typeof logger;
}

export interface SetActivityOptions {
  /**
   * "all" (default) fans the presence out to every shard via broadcastEval —
   * presence is per-shard gateway state and each queue tick is consumed by a
   * single shard's worker. "local" only touches this shard's gateway; used at
   * shard ready, when sibling shards may not be spawned yet.
   */
  scope?: "all" | "local";
}

async function applyActivity(
  client: Client,
  name: string,
  type: ActivityType,
  url: string | undefined,
  scope: "all" | "local"
): Promise<void> {
  if (client.shard && scope === "all") {
    await withTimeout(
      client.shard.broadcastEval(
        (c, ctx) => {
          c.user?.setActivity(ctx.name, { type: ctx.type, url: ctx.url ?? undefined });
        },
        { context: { name, type, url: url ?? null } }
      ),
      BROADCAST_TIMEOUT_MS,
      "Activity broadcast"
    );
  } else {
    client.user?.setActivity(name, { type, url });
  }
}

export async function setActivityCore(
  client: Client,
  { db: _db, env: _env, logger: _logger }: SetActivityDeps,
  { scope = "all" }: SetActivityOptions = {}
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
      await applyActivity(client, defaultActivity, safeActivityType, defaultActivityUrl, scope);
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
    await applyActivity(client, activity.activity, safeActivityType, activity.url ?? undefined, scope);

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
