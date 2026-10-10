import type { Logger } from "drizzle-orm";
import type { Options, PostgresType } from "postgres";

/** Server-side guards so a stuck query or abandoned transaction cannot pin a job slot forever. */
export const STATEMENT_TIMEOUT_MS = 15_000;
export const IDLE_IN_TRANSACTION_TIMEOUT_MS = 30_000;

/** postgres.js options for the bot's shared pool (migrate.ts deliberately uses its own client). */
export function buildClientOptions(poolMax: number): Options<Record<string, PostgresType>> {
  return {
    max: poolMax,
    idle_timeout: 30,
    connect_timeout: 10,
    connection: {
      application_name: "fluffboost-discord",
      statement_timeout: STATEMENT_TIMEOUT_MS,
      idle_in_transaction_session_timeout: IDLE_IN_TRANSACTION_TIMEOUT_MS,
    },
  };
}

/**
 * Opt-in Drizzle query logger. Routes query text (never parameters, which carry
 * quote text and Discord IDs) through the app logger instead of console.log.
 */
export function buildQueryLogger(
  enabled: boolean,
  debug: (component: string, message: string) => void
): Logger | false {
  if (!enabled) {
    return false;
  }
  return {
    logQuery: (query: string) => debug("Database", query),
  };
}
