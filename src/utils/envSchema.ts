import { z } from "zod";

const SNOWFLAKE = /^\d{17,20}$/;
const SNOWFLAKE_LIST = /^\d{17,20}(,\d{17,20})*$/;

export const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "Database URL is required")
    .refine((url) => {
      try {
        const parsedUrl = new URL(url);
        return (
          parsedUrl.protocol === "postgres:" &&
          parsedUrl.hostname &&
          parsedUrl.pathname.length > 1
        );
      } catch {
        return false;
      }
    }, "Invalid PostgreSQL database URL"),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  REDIS_URL: z
    .string()
    .min(1, "Redis URL is required")
    .refine((url) => {
      try {
        const parsedUrl = new URL(url);
        return (
          parsedUrl.protocol === "redis:" || parsedUrl.protocol === "rediss:"
        );
      } catch {
        return false;
      }
    }, "Invalid Redis URL"),
  DISCORD_APPLICATION_ID: z
    .string()
    .regex(SNOWFLAKE, "DISCORD_APPLICATION_ID must be a Discord snowflake"),
  DISCORD_APPLICATION_PUBLIC_KEY: z
    .string()
    .min(1, "Discord application public key is required"),
  DISCORD_APPLICATION_BOT_TOKEN: z
    .string()
    .min(1, "Discord application bot token is required"),
  DISCORD_DEFAULT_STATUS: z.string().default("Spreading Paw-sitivity 🐾"),
  DISCORD_DEFAULT_ACTIVITY_TYPE: z
    .enum(["Playing", "Streaming", "Listening", "Custom"])
    .default("Custom"),
  DEFAULT_ACTIVITY_URL: z.string().optional(),
  DISCORD_ACTIVITY_INTERVAL_MINUTES: z
    .coerce
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(15),
  DISCORD_DEFAULT_MOTIVATIONAL_DAILY_TIME: z.string().default("0 8 * * *"),
  ALLOWED_USERS: z
    .string()
    .optional()
    .refine(
      (v) => !v || SNOWFLAKE_LIST.test(v.split(",").map((s) => s.trim()).join(",")),
      "ALLOWED_USERS must be a comma-separated list of Discord snowflakes"
    ),
  OWNER_ID: z.string().regex(SNOWFLAKE, "OWNER_ID must be a Discord snowflake"),
  MAIN_GUILD_ID: z.string().regex(SNOWFLAKE, "MAIN_GUILD_ID must be a Discord snowflake"),
  MAIN_CHANNEL_ID: z.string().regex(SNOWFLAKE, "MAIN_CHANNEL_ID must be a Discord snowflake"),
  HOST: z.string().optional(),
  PORT: z.string().optional(),
  VERSION: z.string().default("0.0.0-dev"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PREMIUM_ENABLED: z
    .string()
    .default("false")
    .transform((val) => val.toLowerCase() === "true"),
  DISCORD_PREMIUM_SKU_ID: z
    .string()
    .regex(SNOWFLAKE, "DISCORD_PREMIUM_SKU_ID must be a Discord snowflake")
    .optional(),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(4),
})
  .refine(
    (data) => !data.PREMIUM_ENABLED || data.DISCORD_PREMIUM_SKU_ID,
    {
      message: "DISCORD_PREMIUM_SKU_ID is required when PREMIUM_ENABLED is true",
      path: ["DISCORD_PREMIUM_SKU_ID"],
    }
  );
