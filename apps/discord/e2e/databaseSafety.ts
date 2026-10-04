/**
 * The E2E suite creates and drops a schema, so require an explicit operator
 * assertion as well as a loopback URL naming the dedicated test database.
 */
export function requireSafeE2EDatabaseUrl(
  value: string | undefined,
  disposableAssertion: string | undefined,
): string {
  if (!value) {
    throw new Error(
      "Set E2E_DATABASE_URL to a local test PostgreSQL instance before running bot E2E.",
    );
  }
  if (disposableAssertion !== "true") {
    throw new Error(
      "Set E2E_DATABASE_DISPOSABLE=true only after confirming the target database is disposable.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(value);
  } catch {
    throw new Error(
      "Bot E2E requires a loopback PostgreSQL URL for the fluffboost_e2e database.",
    );
  }

  if (
    !["postgres:", "postgresql:"].includes(parsedUrl.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname) ||
    parsedUrl.pathname !== "/fluffboost_e2e"
  ) {
    throw new Error(
      "Bot E2E requires a loopback PostgreSQL URL for the fluffboost_e2e database.",
    );
  }

  return value;
}
