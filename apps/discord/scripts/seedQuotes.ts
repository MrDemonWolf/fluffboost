import { inArray } from "drizzle-orm";
import { db, queryClient } from "../src/database/index.js";
import { motivationQuotes } from "../src/database/schema.js";
import env from "../src/utils/env.js";
import logger from "../src/utils/logger.js";
import { quotes } from "./data/quotes.js";

async function seedQuotes(): Promise<void> {
  const addedBy = env.OWNER_ID;

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
    logger.database.operation("Quote seed: nothing to insert, all quotes already exist", {
      skipped: quotes.length,
    });
    return;
  }

  const inserted = await db
    .insert(motivationQuotes)
    .values(toInsert.map((q) => ({ quote: q.quote, author: q.author, addedBy })))
    .returning();

  logger.database.operation("Quote seed complete", {
    inserted: inserted.length,
    skipped: quotes.length - toInsert.length,
  });
}

seedQuotes()
  .catch((error) => {
    logger.database.error("Quote seed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await queryClient.end();
  });
