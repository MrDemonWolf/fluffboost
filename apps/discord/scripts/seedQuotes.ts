import consola from "consola";
import { inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { motivationQuotes } from "../src/database/schema.js";
import { seedEnvSchema } from "../src/utils/envSchema.js";
import { quotes } from "./data/quotes.js";

// Self-contained like src/database/migrate.ts: it validates only what seeding
// needs (DATABASE_URL, OWNER_ID) and opens its own connection, because the
// bot's env module and logger require the full Discord/Redis configuration.
// consola is used directly for the same reason.
const parsed = seedEnvSchema.safeParse(process.env);
if (!parsed.success) {
  consola.error("Quote seed: invalid environment variables", parsed.error.flatten().fieldErrors);
  process.exit(1);
}
const { DATABASE_URL, OWNER_ID } = parsed.data;

const queryClient = postgres(DATABASE_URL, { max: 1, connect_timeout: 10 });
const db = drizzle(queryClient);

async function seedQuotes(): Promise<void> {
  const existing = await db
    .select({ quote: motivationQuotes.quote })
    .from(motivationQuotes)
    .where(
      inArray(
        motivationQuotes.quote,
        quotes.map((q) => q.quote)
      )
    );
  const existingSet = new Set(existing.map((row) => row.quote.trim().toLowerCase()));

  const toInsert = quotes.filter((q) => !existingSet.has(q.quote.trim().toLowerCase()));

  if (toInsert.length === 0) {
    consola.info("Quote seed: nothing to insert, all quotes already exist", { skipped: quotes.length });
    return;
  }

  const inserted = await db
    .insert(motivationQuotes)
    .values(toInsert.map((q) => ({ quote: q.quote, author: q.author, addedBy: OWNER_ID })))
    .returning();

  consola.success("Quote seed complete", {
    inserted: inserted.length,
    skipped: quotes.length - toInsert.length,
  });
}

seedQuotes()
  .catch((error: unknown) => {
    consola.error("Quote seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
