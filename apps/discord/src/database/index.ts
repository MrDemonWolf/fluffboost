import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import env from "../utils/env.js";
import logger from "../utils/logger.js";
import { buildClientOptions, buildQueryLogger } from "./clientOptions.js";
import * as schema from "./schema.js";

export const queryClient = postgres(env.DATABASE_URL, buildClientOptions(env.DATABASE_POOL_MAX));
export const db = drizzle(queryClient, {
  schema,
  logger: buildQueryLogger(env.DATABASE_QUERY_LOG, (component, message) => logger.debug(component, message)),
});
