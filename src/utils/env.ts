import { z } from "zod";
import dotenv from "dotenv";
import consola from "consola";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .refine((url) => url.startsWith("postgres://"), "Invalid database URL"),
  // Commenting out Redis configuration as it's not used in the current context it will be added later
  // REDIS_HOST: z.string().min(1, "Redis host is required"),
  // REDIS_PORT: z.string().min(1, "Redis port is required"),
  // REDIS_PASSWORD: z.string().optional(),
  // REDIS_DB: z.string().optional(),
  DISCORD_APPLICATION_ID: z
    .string()
    .min(1, "Discord application ID is required"),
  DISCORD_APPLICATION_PUBLIC_KEY: z
    .string()
    .min(1, "Discord application public key is required"),
  DISCORD_APPLICATION_BOT_TOKEN: z
    .string()
    .min(1, "Discord application bot token is required"),
  DISCORD_DEFAULT_STATUS: z.string().optional(),
  DISCORD_DEFAULT_ACTIVITY_TYPE: z
    .enum(["Playing", "Streaming", "Listening", "Custom"])
    .default("Custom"),
  DEFAULT_ACTIVITY_URL: z.string().optional(),
  DISCORD_ACTIVITY_CRON: z.string().default("*/5 * * * *"),
  ALLOWED_USERS: z.string().optional(),
  OWNER_ID: z.string().min(1, "Owner ID is required"),
  MAIN_GUILD_ID: z.string().min(1, "Main guild ID is required"),
  MAIN_CHANNEL_ID: z.string().min(1, "Main channel ID is required"),
  POSTHOG_API_KEY: z.string().min(1, "PostHog API key is required"),
  POSTHOG_HOST: z.string().min(1, "PostHog host is required"),
  HOST: z.string().optional(),
  PORT: z.string().optional(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

type EnvSchema = z.infer<typeof envSchema>;
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  consola.error({
    message: "Invalid environment variables found",
    additional: JSON.stringify(parsed.error.format(), null, 4),
    badge: true,
    timestamp: new Date(),
  });
  process.exit(1);
}
export const env: EnvSchema = parsed.data;
