import { describe, it, expect } from "bun:test";
import { envSchema } from "../../src/utils/envSchema.js";

const SKU = "200000000000000001";

function validEnv(overrides: Record<string, unknown> = {}) {
  return {
    DATABASE_URL: "postgres://user:pass@localhost:5432/testdb",
    REDIS_URL: "redis://localhost:6379",
    DISCORD_APPLICATION_ID: "100000000000000001",
    DISCORD_APPLICATION_PUBLIC_KEY: "key-123",
    DISCORD_APPLICATION_BOT_TOKEN: "token-123",
    OWNER_ID: "100000000000000999",
    MAIN_GUILD_ID: "100000000000000100",
    MAIN_CHANNEL_ID: "100000000000000200",
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
      validEnv({ PREMIUM_ENABLED: "true", DISCORD_PREMIUM_SKU_ID: SKU })
    );
    expect(result.success).toBe(true);
  });

  it("should coerce PREMIUM_ENABLED string 'true' to boolean true", () => {
    const result = envSchema.safeParse(
      validEnv({ PREMIUM_ENABLED: "true", DISCORD_PREMIUM_SKU_ID: SKU })
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PREMIUM_ENABLED).toBe(true);
    }
  });

  it("should accept valid NODE_ENV values", () => {
    for (const nodeEnv of ["development", "production", "test"]) {
      const result = envSchema.safeParse(validEnv({ NODE_ENV: nodeEnv }));
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

  it("should reject non-snowflake OWNER_ID", () => {
    const result = envSchema.safeParse(validEnv({ OWNER_ID: "owner-123" }));
    expect(result.success).toBe(false);
  });

  it("should reject non-snowflake DISCORD_PREMIUM_SKU_ID", () => {
    const result = envSchema.safeParse(
      validEnv({ PREMIUM_ENABLED: "true", DISCORD_PREMIUM_SKU_ID: "sku-not-a-snowflake" })
    );
    expect(result.success).toBe(false);
  });

  it("should accept ALLOWED_USERS as comma-separated snowflakes", () => {
    const result = envSchema.safeParse(
      validEnv({ ALLOWED_USERS: "100000000000000123,100000000000000456" })
    );
    expect(result.success).toBe(true);
  });

  it("should reject ALLOWED_USERS containing non-snowflake entries", () => {
    const result = envSchema.safeParse(validEnv({ ALLOWED_USERS: "user-123,user-456" }));
    expect(result.success).toBe(false);
  });

  it("should default DATABASE_POOL_MAX to 10 when unset", () => {
    const result = envSchema.safeParse(validEnv());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_POOL_MAX).toBe(10);
    }
  });
});
