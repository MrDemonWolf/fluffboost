import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import env from "../utils/env.js";
import * as schema from "./schema.js";

const globalForDb = global as unknown as {
  queryClient: ReturnType<typeof postgres> | undefined;
};

const POOL_MAX = env.DATABASE_POOL_MAX;

export const queryClient =
  globalForDb.queryClient ??
  postgres(env.DATABASE_URL, {
    max: POOL_MAX,
    idle_timeout: 30,
    connect_timeout: 10,
  });
export const db = drizzle(queryClient, { schema, logger: env.NODE_ENV !== "production" });

if (env.NODE_ENV !== "production") {
  globalForDb.queryClient = queryClient;
}
