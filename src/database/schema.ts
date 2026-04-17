import { pgTable, pgEnum, uuid, text, boolean, timestamp, integer, index } from "drizzle-orm/pg-core";
import type { InferSelectModel } from "drizzle-orm";

export const motivationFrequencyEnum = pgEnum("MotivationFrequency", ["Daily", "Weekly", "Monthly"]);
export const discordActivityTypeEnum = pgEnum("DiscordActivityType", ["Custom", "Listening", "Streaming", "Playing"]);
export const suggestionStatusEnum = pgEnum("SuggestionStatus", ["Pending", "Approved", "Rejected"]);

export const guilds = pgTable(
  "Guild",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    guildId: text("guildId").notNull().unique(),
    motivationChannelId: text("motivationChannelId"),
    motivationFrequency: motivationFrequencyEnum("motivationFrequency").notNull().default("Daily"),
    motivationTime: text("motivationTime").notNull().default("08:00"),
    motivationDay: integer("motivationDay"),
    timezone: text("timezone").notNull().default("America/Chicago"),
    lastMotivationSentAt: timestamp("lastMotivationSentAt", { mode: "date" }),
    isPremium: boolean("isPremium").notNull().default(false),
    joinedAt: timestamp("joinedAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    motivationChannelIdx: index("guild_motivation_channel_idx").on(table.motivationChannelId),
  })
);

export const motivationQuotes = pgTable("MotivationQuote", {
  id: uuid("id").primaryKey().defaultRandom(),
  quote: text("quote").notNull(),
  author: text("author").notNull(),
  addedBy: text("addedBy").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

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
  (table) => ({
    statusIdx: index("suggestion_status_idx").on(table.status),
  })
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
