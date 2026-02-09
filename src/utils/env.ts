import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
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
  REDIS_URL: z
    .string()
    .min(1, "Redis URL is required")
    .refine((url) => {
      try {
        const parsedUrl = new URL(url); // Ensure it's a valid URL
        return (
          parsedUrl.protocol === "redis:" || parsedUrl.protocol === "rediss:" // Support both redis and rediss protocols
        );
      } catch {
        return false;
      }
    }, "Invalid Redis URL"),
  DISCORD_APPLICATION_ID: z
    .string()
    .min(1, "Discord application ID is required"),
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
  ALLOWED_USERS: z.string().optional(),
  OWNER_ID: z.string().min(1, "Owner ID is required"),
  MAIN_GUILD_ID: z.string().min(1, "Main guild ID is required"),
  MAIN_CHANNEL_ID: z.string().min(1, "Main channel ID is required"),
  POSTHOG_API_KEY: z.string().min(1, "PostHog API key is required"),
  POSTHOG_HOST: z.string().min(1, "PostHog host is required"),
  HOST: z.string().optional(),
  PORT: z.string().optional(),
  CORS_ORIGIN: z.string().default("*"),
  VERSION: z.string().default("1.9.0"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PREMIUM_ENABLED: z
    .string()
    .default("false")
    .transform((val) => val.toLowerCase() === "true"),
  DISCORD_PREMIUM_SKU_ID: z.string().optional(),
})
  .refine(
    (data) => !data.PREMIUM_ENABLED || data.DISCORD_PREMIUM_SKU_ID,
    {
      message: "DISCORD_PREMIUM_SKU_ID is required when PREMIUM_ENABLED is true",
      path: ["DISCORD_PREMIUM_SKU_ID"],
    }
  );

type EnvSchema = z.infer<typeof envSchema>;
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables found");
  console.error(JSON.stringify(parsed.error.format(), null, 4));
  process.exit(1);
}

const env: EnvSchema = parsed.data;

export default env;
