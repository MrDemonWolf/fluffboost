import { z } from "zod";
import pkg from "../../package.json" with { type: "json" };

const SNOWFLAKE = /^\d{17,20}$/;
const SNOWFLAKE_LIST = /^\d{17,20}(,\d{17,20})*$/;

/**
 * Treat an empty value as unset. `.env` templates and hosting UIs commonly
 * produce `KEY=""`, which `.optional()` alone would validate (and reject).
 */
const blankAsUnset = z.string().optional().transform((value) => (value === "" ? undefined : value));

const optionalSnowflake = (name: string) =>
  blankAsUnset.pipe(z.string().regex(SNOWFLAKE, `${name} must be a Discord snowflake`).optional());

const envObject = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "Database URL is required")
    .refine((url) => {
      try {
        const parsedUrl = new URL(url);
        return (
          (parsedUrl.protocol === "postgres:" || parsedUrl.protocol === "postgresql:") &&
          parsedUrl.hostname &&
          parsedUrl.pathname.length > 1
        );
      } catch {
        return false;
      }
    }, "Invalid PostgreSQL database URL"),
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),
  // Opt-in SQL query logging (query text only, never parameters) via logger.debug.
  DATABASE_QUERY_LOG: z
    .string()
    .default("false")
    .transform((val) => val.toLowerCase() === "true"),
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
  // Not read by the gateway bot (it uses client.application); validated only when set.
  DISCORD_APPLICATION_ID: optionalSnowflake("DISCORD_APPLICATION_ID"),
  DISCORD_APPLICATION_PUBLIC_KEY: blankAsUnset.pipe(z.string().optional()),
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
  ALLOWED_USERS: z
    .string()
    .optional()
    .refine(
      (v) => !v || SNOWFLAKE_LIST.test(v.split(",").map((s) => s.trim()).join(",")),
      "ALLOWED_USERS must be a comma-separated list of Discord snowflakes"
    ),
  OWNER_ID: z.string().regex(SNOWFLAKE, "OWNER_ID must be a Discord snowflake"),
  // Not read by the bot; validated only when set.
  MAIN_GUILD_ID: optionalSnowflake("MAIN_GUILD_ID"),
  MAIN_CHANNEL_ID: z.string().regex(SNOWFLAKE, "MAIN_CHANNEL_ID must be a Discord snowflake"),
  HOST: blankAsUnset.pipe(z.string().optional()),
  PORT: blankAsUnset.pipe(z.coerce.number().int().min(1).max(65535).default(3000)),
  // Defaults to the package version so /about and /changelog never show a placeholder.
  VERSION: blankAsUnset.pipe(z.string().min(1).default(pkg.version)),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PREMIUM_ENABLED: z
    .string()
    .default("false")
    .transform((val) => val.toLowerCase() === "true"),
  DISCORD_PREMIUM_SKU_ID: optionalSnowflake("DISCORD_PREMIUM_SKU_ID"),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(4),
});

export const envSchema = envObject.refine(
  (data) => !data.PREMIUM_ENABLED || data.DISCORD_PREMIUM_SKU_ID,
  {
    message: "DISCORD_PREMIUM_SKU_ID is required when PREMIUM_ENABLED is true",
    path: ["DISCORD_PREMIUM_SKU_ID"],
  }
);

/**
 * The subset scripts/seedQuotes.ts needs, so seeding a database does not
 * require (or silently borrow from a dev .env) the bot's Discord/Redis config.
 */
export const seedEnvSchema = envObject.pick({ DATABASE_URL: true, OWNER_ID: true });
