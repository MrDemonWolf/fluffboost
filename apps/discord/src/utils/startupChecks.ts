import { retryWithBackoff, withTimeout } from "./async.js";
import type { RetryOptions } from "./async.js";

/** The parts of an ioredis client the startup probe uses. */
export interface RedisProbeClient {
  status: string;
  ping(): Promise<string>;
  once(event: "ready", listener: () => void): unknown;
  once(event: "error", listener: (err: Error) => void): unknown;
  off(event: "ready", listener: () => void): unknown;
  off(event: "error", listener: (err: Error) => void): unknown;
}

/**
 * Waits for the client's connection, then PINGs. The shared client has no
 * offline queue, so a PING sent while it is still connecting would be rejected
 * at once ("Stream isn't writeable") instead of reporting the real state.
 * While Redis is down this rejects with ioredis's next connection error
 * (ECONNREFUSED, auth failure, …) rather than that generic message.
 */
export async function probeRedis(client: RedisProbeClient, timeoutMs: number): Promise<void> {
  if (client.status !== "ready") {
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timer);
        client.off("ready", onReady);
        client.off("error", onError);
      };
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`Redis not ready after ${timeoutMs}ms (status: ${client.status})`));
      }, timeoutMs);
      client.once("ready", onReady);
      client.once("error", onError);
    });
  }
  await withTimeout(client.ping(), timeoutMs, "Redis");
}

export const SCHEMA_MISSING_MESSAGE =
  'Database schema missing: public."Guild" does not exist. The database is reachable but unmigrated ' +
  "(SKIP_MIGRATIONS=true skips the entrypoint's migration step). Unset SKIP_MIGRATIONS and redeploy, " +
  "or run `bun run src/database/migrate.ts`, then start the bot again.";

/**
 * True when the app tables exist. With SKIP_MIGRATIONS=true nothing else
 * checks this, and on an empty database the bot would start, report healthy
 * and fail every query.
 */
export async function hasAppSchema(
  query: (text: string) => Promise<readonly Record<string, unknown>[]>
): Promise<boolean> {
  const [row] = await query("SELECT to_regclass('public.\"Guild\"') IS NOT NULL AS \"present\"");
  return row?.["present"] === true;
}

/** A non-OK /gateway/bot answer other than 401 (discord.js throws the bare Response). */
export class ShardCountHttpError extends Error {
  constructor(public readonly status: number) {
    super(`Discord /gateway/bot answered HTTP ${status}`);
    this.name = "ShardCountHttpError";
  }
}

/** An invalid token or a 4xx other than 429 will not fix itself on retry. */
export function isRetryableShardCountError(err: unknown): boolean {
  if (err instanceof ShardCountHttpError) {
    return err.status === 429 || err.status >= 500;
  }
  if (err instanceof Error && "code" in err && (err.code === "TokenInvalid" || err.code === "TokenMissing")) {
    return false;
  }
  // Network errors and timeouts.
  return true;
}

/**
 * Resolves the recommended shard count up front, with a timeout and retries
 * for transient failures. Left to ShardingManager ("auto"), a single bare
 * fetch with no timeout or retry decides whether the whole process starts.
 */
export function resolveShardCount(
  fetchCount: () => Promise<number>,
  options: Omit<RetryOptions, "shouldRetry"> & { timeoutMs: number }
): Promise<number> {
  const attempt = async (): Promise<number> => {
    try {
      return await withTimeout(fetchCount(), options.timeoutMs, "Discord /gateway/bot");
    } catch (err) {
      if (err instanceof Response) {
        throw new ShardCountHttpError(err.status);
      }
      throw err;
    }
  };
  return retryWithBackoff(attempt, { ...options, shouldRetry: isRetryableShardCountError });
}
