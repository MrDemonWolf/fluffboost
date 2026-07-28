CREATE TYPE "public"."DiscordActivityType" AS ENUM('Custom', 'Listening', 'Streaming', 'Playing');--> statement-breakpoint
CREATE TYPE "public"."MotivationFrequency" AS ENUM('Daily', 'Weekly', 'Monthly');--> statement-breakpoint
CREATE TYPE "public"."SuggestionStatus" AS ENUM('Pending', 'Approved', 'Rejected');--> statement-breakpoint
CREATE TABLE "DiscordActivity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity" text NOT NULL,
	"type" "DiscordActivityType" DEFAULT 'Custom' NOT NULL,
	"url" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Guild" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guildId" text NOT NULL,
	"motivationChannelId" text,
	"motivationFrequency" "MotivationFrequency" DEFAULT 'Daily' NOT NULL,
	"motivationTime" text DEFAULT '08:00' NOT NULL,
	"motivationDay" integer,
	"timezone" text DEFAULT 'America/Chicago' NOT NULL,
	"lastMotivationSentAt" timestamp,
	"isPremium" boolean DEFAULT false NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "Guild_guildId_unique" UNIQUE("guildId")
);
--> statement-breakpoint
CREATE TABLE "MotivationQuote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote" text NOT NULL,
	"author" text NOT NULL,
	"addedBy" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "SuggestionQuote" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote" text NOT NULL,
	"author" text NOT NULL,
	"addedBy" text NOT NULL,
	"status" "SuggestionStatus" DEFAULT 'Pending' NOT NULL,
	"reviewedBy" text,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "guild_motivation_channel_idx" ON "Guild" USING btree ("motivationChannelId");--> statement-breakpoint
CREATE INDEX "suggestion_status_idx" ON "SuggestionQuote" USING btree ("status");