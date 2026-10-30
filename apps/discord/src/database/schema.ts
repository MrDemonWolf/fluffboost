import { pgTable, pgEnum, uuid, text, boolean, timestamp, integer, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { InferSelectModel } from "drizzle-orm";
import { DEFAULT_GUILD_SCHEDULE } from "../utils/scheduleConfig.js";

export const motivationFrequencyEnum = pgEnum("MotivationFrequency", ["Daily", "Weekly", "Monthly"]);
export const discordActivityTypeEnum = pgEnum("DiscordActivityType", ["Custom", "Listening", "Streaming", "Playing"]);
export const suggestionStatusEnum = pgEnum("SuggestionStatus", ["Pending", "Approved", "Rejected"]);

export const guilds = pgTable(
  "Guild",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guildId: text("guildId").notNull().unique(),
    motivationChannelId: text("motivationChannelId"),
    motivationFrequency: motivationFrequencyEnum("motivationFrequency").notNull()
      .default(DEFAULT_GUILD_SCHEDULE.motivationFrequency),
    motivationTime: text("motivationTime").notNull().default(DEFAULT_GUILD_SCHEDULE.motivationTime),
    motivationDay: integer("motivationDay"),
    timezone: text("timezone").notNull().default(DEFAULT_GUILD_SCHEDULE.timezone),
    lastMotivationSentAt: timestamp("lastMotivationSentAt", { mode: "date" }),
    isPremium: boolean("isPremium").notNull().default(false),
    // End of the current Premium term (null: open-ended or unknown). Delivery
    // treats a guild as Premium only while isPremium && (null || future).
    premiumEndsAt: timestamp("premiumEndsAt", { mode: "date", withTimezone: true }),
    joinedAt: timestamp("joinedAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [index("guild_motivation_channel_idx").on(table.motivationChannelId)]
);

export const motivationQuotes = pgTable(
  "MotivationQuote",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quote: text("quote").notNull(),
    author: text("author").notNull(),
    addedBy: text("addedBy").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  // Exact-text uniqueness, indexed on md5() so a long quote (rows written
  // before MAX_QUOTE_LENGTH, or multi-byte text) never exceeds the btree row limit.
  (table) => [uniqueIndex("motivation_quote_text_unique").using("btree", sql`md5(${table.quote})`)]
);

export const suggestionQuotes = pgTable(
  "SuggestionQuote",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quote: text("quote").notNull(),
    author: text("author").notNull(),
    addedBy: text("addedBy").notNull(),
    status: suggestionStatusEnum("status").notNull().default("Pending"),
    reviewedBy: text("reviewedBy"),
    reviewedAt: timestamp("reviewedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("suggestion_status_idx").on(table.status),
    // /admin suggestion list pages by createdAt DESC, id DESC, with or without a
    // status filter. Ascending on purpose: a backward scan yields DESC NULLS FIRST,
    // which is what that ORDER BY means (a DESC NULLS LAST index would not match).
    index("suggestion_status_created_idx").on(table.status, table.createdAt, table.id),
    index("suggestion_created_idx").on(table.createdAt, table.id),
  ]
);

export const discordActivities = pgTable("DiscordActivity", {
  id: uuid("id").primaryKey().defaultRandom(),
  activity: text("activity").notNull(),
  type: discordActivityTypeEnum("type").notNull().default("Custom"),
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
