/**
 * Drizzle schema: the single source of truth for tables, enums and row types.
 * After editing, generate and commit a migration (see AGENTS.md); never edit a
 * committed one.
 */
import { pgTable, pgEnum, uuid, text, boolean, timestamp, integer, index } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";
import { DEFAULT_GUILD_SCHEDULE } from "../utils/scheduleConfig.js";

// The TS union types at the bottom repeat these values; keep them in sync.
export const motivationFrequencyEnum = pgEnum("MotivationFrequency", ["Daily", "Weekly", "Monthly"]);
export const discordActivityTypeEnum = pgEnum("DiscordActivityType", ["Custom", "Listening", "Streaming", "Playing"]);
export const suggestionStatusEnum = pgEnum("SuggestionStatus", ["Pending", "Approved", "Rejected"]);

/** One row per guild the bot is in: delivery channel, schedule and cached Premium flag. */
export const guilds = pgTable(
  "Guild",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Discord guild snowflake; `id` is the internal row key. */
    guildId: text("guildId").notNull().unique(),
    /** Null until a channel is configured; the motivation worker skips such guilds. */
    motivationChannelId: text("motivationChannelId"),
    motivationFrequency: motivationFrequencyEnum("motivationFrequency").notNull()
      .default(DEFAULT_GUILD_SCHEDULE.motivationFrequency),
    motivationTime: text("motivationTime").notNull().default(DEFAULT_GUILD_SCHEDULE.motivationTime),
    /** Weekly: 0-6 (Sunday = 0). Monthly: 1-28. Null for Daily. Only /setup schedule validates it. */
    motivationDay: integer("motivationDay"),
    timezone: text("timezone").notNull().default(DEFAULT_GUILD_SCHEDULE.timezone),
    /** Delivery claim marker, set just before the send (see claimGuild in sendMotivationCore.ts). */
    lastMotivationSentAt: timestamp("lastMotivationSentAt", { mode: "date" }),
    /** Cached entitlement state, kept current by entitlement events and Premium reconciliation. */
    isPremium: boolean("isPremium").notNull().default(false),
    joinedAt: timestamp("joinedAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("guild_motivation_channel_idx").on(table.motivationChannelId)]
);

/** The quote library that scheduled deliveries and /quote draw from at random. */
export const motivationQuotes = pgTable("MotivationQuote", {
  id: uuid("id").primaryKey().defaultRandom(),
  quote: text("quote").notNull(),
  author: text("author").notNull(),
  /** Discord user ID of the admin who added it, or the original submitter of an approved suggestion. */
  addedBy: text("addedBy").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

/** User-submitted quotes and their review state; approval also inserts a motivationQuotes row. */
export const suggestionQuotes = pgTable(
  "SuggestionQuote",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quote: text("quote").notNull(),
    author: text("author").notNull(),
    addedBy: text("addedBy").notNull(),
    status: suggestionStatusEnum("status").notNull().default("Pending"),
    /** Discord user ID of the reviewer; null (as is reviewedAt) while Pending. */
    reviewedBy: text("reviewedBy"),
    reviewedAt: timestamp("reviewedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("suggestion_status_idx").on(table.status)]
);

/** Bot presence entries rotated by the set-activity job, alongside the env default. */
export const discordActivities = pgTable("DiscordActivity", {
  id: uuid("id").primaryKey().defaultRandom(),
  activity: text("activity").notNull(),
  type: discordActivityTypeEnum("type").notNull().default("Custom"),
  /** Stream URL; Discord only uses it for the Streaming type. */
  url: text("url"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export type Guild = InferSelectModel<typeof guilds>;
export type MotivationQuote = InferSelectModel<typeof motivationQuotes>;
export type SuggestionQuote = InferSelectModel<typeof suggestionQuotes>;
export type DiscordActivity = InferSelectModel<typeof discordActivities>;
export type MotivationFrequency = "Daily" | "Weekly" | "Monthly";
export type DiscordActivityType = "Custom" | "Listening" | "Streaming" | "Playing";
export type SuggestionStatus = "Pending" | "Approved" | "Rejected";
