import { describe, it, expect } from "bun:test";
import { envSchema } from "../../src/utils/env.js";

function validEnv(overrides: Record<string, unknown> = {}) {
  return {
    DATABASE_URL: "postgres://user:pass@localhost:5432/testdb",
    REDIS_URL: "redis://localhost:6379",
    DISCORD_APPLICATION_ID: "app-123",
    DISCORD_APPLICATION_PUBLIC_KEY: "key-123",
    DISCORD_APPLICATION_BOT_TOKEN: "token-123",
    OWNER_ID: "owner-123",
    MAIN_GUILD_ID: "guild-123",
    MAIN_CHANNEL_ID: "channel-123",
    ...overrides,
  };
}

describe("envSchema", () => {
  it("should parse valid config with all required fields", () => {
    const result = envSchema.safeParse(validEnv());
    expect(result.success).toBe(true);
  });

  it("should fail when DATABASE_URL is missing", () => {
    const { DATABASE_URL: _, ...env } = validEnv();
    const result = envSchema.safeParse(env);
    expect(result.success).toBe(false);
  });

  it("should fail when DATABASE_URL has non-postgres protocol", () => {
    const result = envSchema.safeParse(validEnv({ DATABASE_URL: "mysql://user:pass@localhost/db" }));
    expect(result.success).toBe(false);
  });

  it("should fail when REDIS_URL has non-redis protocol", () => {
    const result = envSchema.safeParse(validEnv({ REDIS_URL: "http://localhost:6379" }));
    expect(result.success).toBe(false);
  });

  it("should fail when PREMIUM_ENABLED is true without DISCORD_PREMIUM_SKU_ID", () => {
    const result = envSchema.safeParse(validEnv({ PREMIUM_ENABLED: "true" }));
    expect(result.success).toBe(false);
  });

  it("should pass when PREMIUM_ENABLED is true with DISCORD_PREMIUM_SKU_ID", () => {
    const result = envSchema.safeParse(
      validEnv({ PREMIUM_ENABLED: "true", DISCORD_PREMIUM_SKU_ID: "sku-123" })
    );
    expect(result.success).toBe(true);
  });

  it("should coerce PREMIUM_ENABLED string 'true' to boolean true", () => {
    const result = envSchema.safeParse(
      validEnv({ PREMIUM_ENABLED: "true", DISCORD_PREMIUM_SKU_ID: "sku-123" })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PREMIUM_ENABLED).toBe(true);
    }
  });

  it("should accept valid NODE_ENV values", () => {
    for (const nodeEnv of ["development", "production", "test"]) {
      const overrides: Record<string, string> = { NODE_ENV: nodeEnv };
      if (nodeEnv === "production") {
        overrides.CORS_ORIGIN = "https://app.example.com";
      }
      const result = envSchema.safeParse(validEnv(overrides));
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid NODE_ENV values", () => {
    const result = envSchema.safeParse(validEnv({ NODE_ENV: "staging" }));
    expect(result.success).toBe(false);
  });

  it("should allow optional fields to be omitted", () => {
    const result = envSchema.safeParse(validEnv());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ALLOWED_USERS).toBeUndefined();
      expect(result.data.HOST).toBeUndefined();
      expect(result.data.PORT).toBeUndefined();
    }
  });

  it("should reject wildcard CORS_ORIGIN in production", () => {
    const result = envSchema.safeParse(validEnv({ NODE_ENV: "production", CORS_ORIGIN: "*" }));
    expect(result.success).toBe(false);
  });

  it("should reject missing CORS_ORIGIN in production", () => {
    const result = envSchema.safeParse(validEnv({ NODE_ENV: "production" }));
    expect(result.success).toBe(false);
  });

  it("should accept specific CORS_ORIGIN in production", () => {
    const result = envSchema.safeParse(
      validEnv({ NODE_ENV: "production", CORS_ORIGIN: "https://app.example.com" })
    );
    expect(result.success).toBe(true);
  });

  it("should allow wildcard CORS_ORIGIN in development", () => {
    const result = envSchema.safeParse(validEnv({ CORS_ORIGIN: "*" }));
    expect(result.success).toBe(true);
  });
});
