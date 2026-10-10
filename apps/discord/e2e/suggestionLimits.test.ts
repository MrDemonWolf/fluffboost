import { afterAll, beforeAll, describe, expect, mock, test } from "bun:test";
import type { Redis } from "ioredis";
import { mockEnv, mockLogger } from "../tests/helpers.js";
import { requireSafeE2ERedisUrl } from "./redisSafety.js";

/**
 * Runs the real suggestion-quota Lua scripts against a disposable Redis.
 * Opt-in locally (set E2E_REDIS_URL + E2E_REDIS_DISPOSABLE=true, e.g. against
 * `docker compose up redis`); mandatory in CI so it cannot silently skip there.
 */
const configured = Boolean(process.env["E2E_REDIS_URL"]) || process.env["CI"] === "true";

describe.skipIf(!configured)("suggestion quota (real Redis)", () => {
  // Unique per run, so state never leaks between runs or touches real users' keys.
  const userId = `e2e-${crypto.randomUUID()}`;
  const key = `fluffboost:suggestion-rate:${userId}`;
  let redis: Redis;
  let bullRedis: Redis;
  let limits: typeof import("../src/utils/suggestionLimits.js");

  beforeAll(async () => {
    const redisUrl = requireSafeE2ERedisUrl(process.env["E2E_REDIS_URL"], process.env["E2E_REDIS_DISPOSABLE"]);
    // src/redis/index.ts reads env at import, so point it at the disposable instance first.
    mock.module("../src/utils/env.js", () => ({ default: mockEnv({ REDIS_URL: redisUrl }) }));
    mock.module("../src/utils/logger.js", () => ({ default: mockLogger() }));

    const clients = await import("../src/redis/index.js");
    redis = clients.default;
    bullRedis = clients.bullRedis;
    // The interactive client has no offline queue, so wait for the connection.
    if (redis.status !== "ready") {
      await new Promise<void>((resolve, reject) => {
        redis.once("ready", resolve);
        redis.once("error", reject);
      });
    }
    limits = await import("../src/utils/suggestionLimits.js");
  });

  afterAll(async () => {
    if (redis?.status === "ready") {
      await redis.del(key);
      await redis.quit();
    } else {
      redis?.disconnect();
    }
    // Lazy and never connected here; disconnect just releases it.
    bullRedis?.disconnect();
  });

  async function redisNowMs(): Promise<number> {
    const [seconds, micros] = await redis.time();
    return Number(seconds) * 1000 + Math.floor(Number(micros) / 1000);
  }

  test("allows exactly the daily limit, then denies", async () => {
    await redis.del(key);
    const results: boolean[] = [];
    for (let i = 0; i < limits.MAX_SUGGESTIONS_PER_USER_PER_DAY + 1; i++) {
      results.push(await limits.consumeSuggestionSlot(userId, `i${i}`));
    }

    expect(results).toEqual([true, true, true, false]);
    expect(await redis.zcard(key)).toBe(limits.MAX_SUGGESTIONS_PER_USER_PER_DAY);
    const ttl = await redis.pttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(limits.SUGGESTION_RATE_LIMIT_WINDOW_MS);
  });

  test("releasing a reservation frees exactly one slot", async () => {
    await redis.del(key);
    for (const id of ["a", "b", "c"]) {
      expect(await limits.consumeSuggestionSlot(userId, id)).toBe(true);
    }

    await limits.releaseSuggestionSlot(userId, "b");
    expect(await limits.consumeSuggestionSlot(userId, "d")).toBe(true);
    expect(await limits.consumeSuggestionSlot(userId, "e")).toBe(false);
  });

  test("releasing every reservation deletes the key", async () => {
    await redis.del(key);
    await limits.consumeSuggestionSlot(userId, "only");
    await limits.releaseSuggestionSlot(userId, "only");

    expect(await redis.exists(key)).toBe(0);
    // Releasing an unknown id is a no-op.
    await limits.releaseSuggestionSlot(userId, "never-reserved");
    expect(await redis.exists(key)).toBe(0);
  });

  test("the window is rolling and measured in milliseconds", async () => {
    const windowMs = limits.SUGGESTION_RATE_LIMIT_WINDOW_MS;
    const now = await redisNowMs();

    // Reservations just older than the window are trimmed and do not count.
    await redis.del(key);
    const expired = now - windowMs - 1_000;
    await redis.zadd(key, expired, "old1", expired, "old2", expired, "old3");
    expect(await limits.consumeSuggestionSlot(userId, "fresh")).toBe(true);
    expect(await redis.zrange(key, 0, -1)).toEqual(["fresh"]);

    // Reservations a minute inside the window still count toward the limit.
    await redis.del(key);
    const recent = now - windowMs + 60_000;
    await redis.zadd(key, recent, "r1", recent, "r2", recent, "r3");
    expect(await limits.consumeSuggestionSlot(userId, "denied")).toBe(false);
  });
});
