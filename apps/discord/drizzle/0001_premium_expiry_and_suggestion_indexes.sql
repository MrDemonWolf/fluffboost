ALTER TABLE "Guild" ADD COLUMN "premiumEndsAt" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "suggestion_status_created_idx" ON "SuggestionQuote" USING btree ("status","createdAt","id");--> statement-breakpoint
CREATE INDEX "suggestion_created_idx" ON "SuggestionQuote" USING btree ("createdAt","id");