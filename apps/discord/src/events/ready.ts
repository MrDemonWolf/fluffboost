import type { Client } from "discord.js";

import { backoffDelay } from "../utils/async.js";
import logger from "../utils/logger.js";
import { slashCommands } from "./commandRegistry.js";
import { pruneGuilds, ensureGuildExists, setActivity, reconcilePremium } from "./readyDeps.js";

const COMPONENT = "Discord - Event (Ready)";

/** Command registration retries: 30 s, 60 s, … capped at 10 min, then gives up until the next start. */
export const COMMAND_RETRY_BASE_MS = 30_000;
const COMMAND_RETRY_MAX_MS = 10 * 60_000;
export const COMMAND_RETRY_ATTEMPTS = 6;

const retryTimers = new Set<ReturnType<typeof setTimeout>>();

/** Clears pending registration retries (called from shard shutdown). */
export function cancelReadyRetries(): void {
  for (const timer of retryTimers) {
    clearTimeout(timer);
  }
  retryTimers.clear();
}

/**
 * Every ready step is best-effort: the gateway session is already up, and
 * exiting here would make ShardingManager respawn the shard immediately, spending
 * another IDENTIFY on each loop. A failed step is logged and the shard keeps
 * serving with the state it has (stored premium flags, previously registered
 * commands, default presence until the worker's next rotation).
 */
async function bestEffort<T>(step: string, run: () => Promise<T>): Promise<void> {
  try {
    await run();
  } catch (err) {
    logger.error(COMPONENT, `${step} failed; continuing startup`, err);
  }
}

/**
 * Register slash commands. They are global (application-level), so only shard 0
 * registers — otherwise every shard performs the same bulk overwrite on every
 * startup. Failures retry on unref'd timers; the previously registered command
 * set stays live meanwhile.
 */
async function registerCommands(client: Client, attempt = 0): Promise<void> {
  try {
    logger.info("Discord - Slash Commands", "Registering commands");

    const commands = await client.application?.commands.set(slashCommands);
    const commandNames = commands?.map((command) => command.name) || [];

    logger.success(
      "Discord - Slash Commands",
      `Registered ${commandNames.length} commands`,
      {
        commands: commandNames,
        timestamp: new Date().toISOString(),
      }
    );
  } catch (err) {
    if (attempt + 1 >= COMMAND_RETRY_ATTEMPTS) {
      logger.error("Discord - Slash Commands", "Command registration failed; giving up until next start", err);
      return;
    }
    const delayMs = backoffDelay(attempt, COMMAND_RETRY_BASE_MS, COMMAND_RETRY_MAX_MS);
    logger.error("Discord - Slash Commands", "Command registration failed; retrying", err, { delayMs });
    const timer = setTimeout(() => {
      retryTimers.delete(timer);
      void registerCommands(client, attempt + 1);
    }, delayMs);
    timer.unref();
    retryTimers.add(timer);
  }
}

/** Never rejects; see bestEffort above. */
export async function readyEvent(client: Client): Promise<void> {
  /**
   * Show the bot is ready in the console.
   */
  const username = client.user?.tag || "Unknown";
  const guildCount = client.guilds.cache.size;

  logger.discord.ready(username, guildCount);

  /**
   * Check if the bot is not in a guild anymore and remove it from the database.
   */
  await bestEffort("Guild prune", () => pruneGuilds(client));

  /**
   * Check if guilds exist in the database and add them if they don't.
   */
  await bestEffort("Guild sync", () => ensureGuildExists(client));

  /**
   * Startup Premium reconciliation. On failure the stored isPremium flags stay
   * in effect until entitlement events or the periodic reconciliation loop
   * catch up.
   */
  await bestEffort("Premium reconciliation", () => reconcilePremium(client));

  if (client.shard?.ids.includes(0) ?? true) {
    await registerCommands(client);
  }

  /**
   * Apply this shard's initial activity (local-only: sibling shards may not
   * be ready yet, and each shard runs this for itself). The worker's
   * set-activity ticks handle the cross-shard rotation afterwards.
   */
  await bestEffort("Initial activity", () => setActivity(client, { scope: "local" }));
}
