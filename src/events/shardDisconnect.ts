import logger from "../utils/logger";

export function shardDisconnectEvent() {
  logger.error("Discord", "Shard disconnected - exiting process");
  process.exit(1);
}
