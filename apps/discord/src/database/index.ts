/**
 * Database connection for the bot (manager and shards). Importing this module
 * creates the pool (connections open lazily), so side-effect-free modules import it type-only.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import env from "../utils/env.js";
import logger from "../utils/logger.js";
import { buildClientOptions, buildQueryLogger } from "./clientOptions.js";
import * as schema from "./schema.js";

/**
 * The process-wide postgres.js pool. Use it directly only for raw probes
 * (`SELECT 1`) and shutdown (`queryClient.end()`); app queries go through `db`.
 */
export const queryClient = postgres(env.DATABASE_URL, buildClientOptions(env.DATABASE_POOL_MAX));
/** Drizzle instance over `queryClient`, with the full schema attached. */
export const db = drizzle(queryClient, {
  schema,
  logger: buildQueryLogger(env.DATABASE_QUERY_LOG, (component, message) => logger.debug(component, message)),
});
