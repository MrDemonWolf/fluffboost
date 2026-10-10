import logger from "../utils/logger.js";

/**
 * discord.js emits ShardDisconnect only for unrecoverable gateway closes
 * (4004 authentication failed, 4010-4014 sharding/intents/version errors) and
 * does not reconnect afterwards; recoverable drops emit ShardReconnecting.
 * Left alone the shard would stay up as a zombie with no gateway session, so
 * the caller treats this as fatal (delayed, non-zero exit; the manager
 * escalates a crash loop to a container restart).
 */
export function shardDisconnectEvent(
  event: { code: number; reason?: string },
  shardId: number,
  onFatal: () => void
): void {
  logger.error(
    "Discord - Event (Shard Disconnect)",
    "Unrecoverable gateway close; Discord.js will not reconnect, exiting shard",
    undefined,
    { code: event.code, reason: event.reason || undefined, shardId }
  );
  onFatal();
}
