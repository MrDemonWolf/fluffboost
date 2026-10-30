-- Dedupe before the unique index: keep the oldest row per exact quote text
-- (createdAt, then id as the tiebreak) and delete the rest. No foreign key
-- references "MotivationQuote", so nothing needs re-pointing. The lock keeps
-- a concurrent insert from adding a duplicate between the DELETE and the index.
LOCK TABLE "MotivationQuote" IN SHARE ROW EXCLUSIVE MODE;--> statement-breakpoint
DELETE FROM "MotivationQuote" AS q
USING (
	SELECT "id", row_number() OVER (PARTITION BY "quote" ORDER BY "createdAt", "id") AS rn
	FROM "MotivationQuote"
) AS ranked
WHERE q."id" = ranked."id" AND ranked.rn > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "motivation_quote_text_unique" ON "MotivationQuote" USING btree (md5("quote"));
