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
  DISCORD_ACTIVITY_CRON: z
    .string()
    .refine((cron) => {
      try {
        const parts = cron.split(" ");
        // Must be 5 or 6 fields, none empty
        if (parts.length !== 5 && parts.length !== 6) {
return false;
}
        if (parts.some((part) => part === "")) {
return false;
}

        // Basic validation for each of the first five fields
        const ranges = [
          [0, 59], // minute
          [0, 23], // hour
          [1, 31], // day of month
          [1, 12], // month
          [0, 7], // day of week
        ];

        for (let i = 0; i < Math.min(parts.length, 5); i++) {
          const part = parts[i];
          // Allow wildcards and step values
          if (part === "*" || part.includes("*/")) {
continue;
}
          // Allow ranges and lists
          if (part.includes("-") || part.includes(",")) {
continue;
}
          // Otherwise it must be a valid integer within range
          const num = parseInt(part, 10);
          if (isNaN(num) || num < ranges[i][0] || num > ranges[i][1]) {
            return false;
          }
        }

        return true;
      } catch {
        return false;
      }
    }, "Invalid cron expression for Discord activity")
    .default("0 * * * *"), // Default to every hour
  ALLOWED_USERS: z.string().optional(),
  OWNER_ID: z.string().min(1, "Owner ID is required"),
  MAIN_GUILD_ID: z.string().min(1, "Main guild ID is required"),
  MAIN_CHANNEL_ID: z.string().min(1, "Main channel ID is required"),
  POSTHOG_API_KEY: z.string().min(1, "PostHog API key is required"),
  POSTHOG_HOST: z.string().min(1, "PostHog host is required"),
  HOST: z.string().optional(),
  PORT: z.string().optional(),
  CORS_ORIGIN: z.string().default("*"),
  VERSION: z.string().default("unknown"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

type EnvSchema = z.infer<typeof envSchema>;
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables found");
  console.error(JSON.stringify(parsed.error.format(), null, 4));
  process.exit(1);
}

const env: EnvSchema = parsed.data;

export default env;
