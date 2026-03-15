import { expect } from "chai";
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
    POSTHOG_API_KEY: "phk_test",
    POSTHOG_HOST: "https://posthog.test",
    ...overrides,
  };
}

describe("envSchema", () => {
  it("should parse valid config with all required fields", () => {
    const result = envSchema.safeParse(validEnv());
    expect(result.success).to.be.true;
  });

  it("should fail when DATABASE_URL is missing", () => {
    const { DATABASE_URL: _, ...env } = validEnv();
    const result = envSchema.safeParse(env);
    expect(result.success).to.be.false;
  });

  it("should fail when DATABASE_URL has non-postgres protocol", () => {
    const result = envSchema.safeParse(validEnv({ DATABASE_URL: "mysql://user:pass@localhost/db" }));
    expect(result.success).to.be.false;
  });

  it("should fail when REDIS_URL has non-redis protocol", () => {
    const result = envSchema.safeParse(validEnv({ REDIS_URL: "http://localhost:6379" }));
    expect(result.success).to.be.false;
  });

  it("should fail when PREMIUM_ENABLED is true without DISCORD_PREMIUM_SKU_ID", () => {
    const result = envSchema.safeParse(validEnv({ PREMIUM_ENABLED: "true" }));
    expect(result.success).to.be.false;
  });

  it("should pass when PREMIUM_ENABLED is true with DISCORD_PREMIUM_SKU_ID", () => {
    const result = envSchema.safeParse(
      validEnv({ PREMIUM_ENABLED: "true", DISCORD_PREMIUM_SKU_ID: "sku-123" })
    );
    expect(result.success).to.be.true;
  });

  it("should coerce PREMIUM_ENABLED string 'true' to boolean true", () => {
    const result = envSchema.safeParse(
      validEnv({ PREMIUM_ENABLED: "true", DISCORD_PREMIUM_SKU_ID: "sku-123" })
    );
    expect(result.success).to.be.true;
    if (result.success) {
      expect(result.data.PREMIUM_ENABLED).to.be.true;
    }
  });

  it("should accept valid NODE_ENV values", () => {
    for (const nodeEnv of ["development", "production", "test"]) {
      const result = envSchema.safeParse(validEnv({ NODE_ENV: nodeEnv }));
      expect(result.success).to.be.true;
    }
  });

  it("should reject invalid NODE_ENV values", () => {
    const result = envSchema.safeParse(validEnv({ NODE_ENV: "staging" }));
    expect(result.success).to.be.false;
  });

  it("should allow optional fields to be omitted", () => {
    const result = envSchema.safeParse(validEnv());
    expect(result.success).to.be.true;
    if (result.success) {
      expect(result.data.ALLOWED_USERS).to.be.undefined;
      expect(result.data.HOST).to.be.undefined;
      expect(result.data.PORT).to.be.undefined;
    }
  });
});
