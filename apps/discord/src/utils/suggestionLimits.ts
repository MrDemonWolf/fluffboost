import redis from "../redis/index.js";

export const MAX_SUGGESTIONS_PER_USER_PER_DAY = 3;
export const SUGGESTION_RATE_LIMIT_WINDOW_MS = 24 * 60 * 60 * 1000;

const CONSUME_SUGGESTION_SLOT_SCRIPT = `
local now = redis.call("TIME")
local nowMs = tonumber(now[1]) * 1000 + math.floor(tonumber(now[2]) / 1000)
local windowMs = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])

redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", nowMs - windowMs)
if redis.call("ZCARD", KEYS[1]) >= limit then
  return 0
end

redis.call("ZADD", KEYS[1], nowMs, ARGV[3])
redis.call("PEXPIRE", KEYS[1], windowMs)
return 1
`;

const RELEASE_SUGGESTION_SLOT_SCRIPT = `
local removed = redis.call("ZREM", KEYS[1], ARGV[1])
if redis.call("ZCARD", KEYS[1]) == 0 then
  redis.call("DEL", KEYS[1])
end
return removed
`;

function suggestionRateLimitKey(userId: string): string {
  return `fluffboost:suggestion-rate:${userId}`;
}

/**
 * Atomically allow up to three suggestions from one Discord user in any
 * rolling 24-hour window. Redis keeps the quota shared across bot shards.
 */
export async function consumeSuggestionSlot(
  userId: string,
  interactionId: string,
): Promise<boolean> {
  const result = await redis.eval(
    CONSUME_SUGGESTION_SLOT_SCRIPT,
    1,
    suggestionRateLimitKey(userId),
    String(SUGGESTION_RATE_LIMIT_WINDOW_MS),
    String(MAX_SUGGESTIONS_PER_USER_PER_DAY),
    interactionId,
  );

  return result === 1 || result === "1";
}

/** Release the quota reservation when persistence fails. */
export async function releaseSuggestionSlot(
  userId: string,
  interactionId: string,
): Promise<void> {
  await redis.eval(
    RELEASE_SUGGESTION_SLOT_SCRIPT,
    1,
    suggestionRateLimitKey(userId),
    interactionId,
  );
}
