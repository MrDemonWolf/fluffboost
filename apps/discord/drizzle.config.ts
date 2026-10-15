// drizzle-kit config for the `bun run db:*` scripts (generate/push/migrate/studio/pull). schema.ts is the source
// of truth; generated SQL + meta land in ./drizzle and are committed. `generate` diffs against the committed
// snapshot without connecting, so only the DB-touching commands need a real DATABASE_URL.
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/database/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
