import logger from "../utils/logger.js";

/**
 * Discord.js handles gateway reconnection automatically. We log the event
 * and let the client recover instead of killing the entire process on every
 * transient disconnect.
 */
export function shardDisconnectEvent(): void {
  logger.warn(
    "Discord - Event (Shard Disconnect)",
    "Shard disconnected — Discord.js will attempt to reconnect"
  );
}
