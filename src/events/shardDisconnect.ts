import logger from "../utils/logger";

export function shardDisconnectEvent() {
  logger.error("Discord - Event (Shard Disconnect)", "Shard disconnected - exiting process");
  process.exit(1);
}
