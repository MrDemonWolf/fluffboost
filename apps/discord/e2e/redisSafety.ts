/**
 * The Redis E2E writes and deletes keys, so, like the PostgreSQL guard,
 * require an explicit operator assertion plus a loopback URL. Keys are
 * per-run unique, but a dev Redis still must never be targeted by accident.
 */
export function requireSafeE2ERedisUrl(
  value: string | undefined,
  disposableAssertion: string | undefined,
): string {
  if (!value) {
    throw new Error("Set E2E_REDIS_URL to a local test Redis instance before running Redis E2E.");
  }
  if (disposableAssertion !== "true") {
    throw new Error(
      "Set E2E_REDIS_DISPOSABLE=true only after confirming the target Redis is disposable.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error("Redis E2E requires a loopback redis:// URL.");
  }

  if (
    parsedUrl.protocol !== "redis:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname)
  ) {
    throw new Error("Redis E2E requires a loopback redis:// URL.");
  }

  return value;
}
