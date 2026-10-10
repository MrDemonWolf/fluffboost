import logger from "./logger.js";

/**
 * Logs BullMQ/Redis errors through the logger instead of BullMQ's console
 * fallback, collapsing a repeating error (every reconnect attempt during an
 * outage) into one line per `intervalMs`.
 */
export function createThrottledErrorLogger(component: string, label: string, intervalMs = 60_000) {
  let lastMessage = "";
  let lastLoggedAt = 0;
  let suppressed = 0;
  return (err: Error): void => {
    const now = Date.now();
    if (err.message === lastMessage && now - lastLoggedAt < intervalMs) {
      suppressed++;
      return;
    }
    logger.error(component, label, err, suppressed ? { suppressedRepeats: suppressed } : undefined);
    lastMessage = err.message;
    lastLoggedAt = now;
    suppressed = 0;
  };
}
