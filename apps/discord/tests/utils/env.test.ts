import { describe, it, expect } from "bun:test";
import fs from "node:fs";
import pkg from "../../package.json" with { type: "json" };
import { envSchema, seedEnvSchema } from "../../src/utils/envSchema.js";

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
      expect(result.data.PORT).toBe(3000);
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

  it("should coerce PORT to a number", () => {
    const result = envSchema.safeParse(validEnv({ PORT: "8080" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(8080);
    }
  });

  it("should default an empty PORT to 3000", () => {
    const result = envSchema.safeParse(validEnv({ PORT: "" }));
    expect(result.success && result.data.PORT).toBe(3000);
  });

  it("should reject non-numeric and out-of-range PORT values", () => {
    for (const port of ["abc", "300O", "0", "65536", "70000", "3000.5"]) {
      expect(envSchema.safeParse(validEnv({ PORT: port })).success).toBe(false);
    }
  });

  it("should keep HOST as an optional string and treat empty as unset", () => {
    const set = envSchema.safeParse(validEnv({ HOST: "127.0.0.1" }));
    expect(set.success && set.data.HOST).toBe("127.0.0.1");
    const empty = envSchema.safeParse(validEnv({ HOST: "" }));
    expect(empty.success).toBe(true);
    if (empty.success) {
      expect(empty.data.HOST).toBeUndefined();
    }
  });

  it("should treat an empty DISCORD_PREMIUM_SKU_ID as unset when Premium is off", () => {
    const result = envSchema.safeParse(validEnv({ PREMIUM_ENABLED: "false", DISCORD_PREMIUM_SKU_ID: "" }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DISCORD_PREMIUM_SKU_ID).toBeUndefined();
    }
  });

  it("should require DISCORD_PREMIUM_SKU_ID when Premium is on and the SKU is empty", () => {
    const result = envSchema.safeParse(validEnv({ PREMIUM_ENABLED: "true", DISCORD_PREMIUM_SKU_ID: "" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain(
        "DISCORD_PREMIUM_SKU_ID is required when PREMIUM_ENABLED is true"
      );
    }
  });

  it("should not require the unused DISCORD_APPLICATION_ID, public key or MAIN_GUILD_ID", () => {
    const {
      DISCORD_APPLICATION_ID: _id,
      DISCORD_APPLICATION_PUBLIC_KEY: _key,
      MAIN_GUILD_ID: _guild,
      ...env
    } = validEnv();
    expect(envSchema.safeParse(env).success).toBe(true);
    const empty = envSchema.safeParse(
      validEnv({ DISCORD_APPLICATION_ID: "", DISCORD_APPLICATION_PUBLIC_KEY: "", MAIN_GUILD_ID: "" })
    );
    expect(empty.success).toBe(true);
  });

  it("should still validate DISCORD_APPLICATION_ID and MAIN_GUILD_ID when present", () => {
    expect(envSchema.safeParse(validEnv({ DISCORD_APPLICATION_ID: "app-123" })).success).toBe(false);
    expect(envSchema.safeParse(validEnv({ MAIN_GUILD_ID: "guild-123" })).success).toBe(false);
  });

  it("should default VERSION to the package.json version", () => {
    for (const version of [undefined, ""]) {
      const result = envSchema.safeParse(validEnv({ VERSION: version }));
      expect(result.success && result.data.VERSION).toBe(pkg.version);
    }
    const override = envSchema.safeParse(validEnv({ VERSION: "2.1.0-rc.1" }));
    expect(override.success && override.data.VERSION).toBe("2.1.0-rc.1");
  });

  it("should keep DATABASE_QUERY_LOG off unless explicitly enabled", () => {
    const unset = envSchema.safeParse(validEnv());
    expect(unset.success && unset.data.DATABASE_QUERY_LOG).toBe(false);
    const enabled = envSchema.safeParse(validEnv({ DATABASE_QUERY_LOG: "true" }));
    expect(enabled.success && enabled.data.DATABASE_QUERY_LOG).toBe(true);
  });

  it("should accept the shipped .env.example once the required secrets are filled in", () => {
    const template = fs.readFileSync(new URL("../../.env.example", import.meta.url), "utf8");
    const parsedTemplate: Record<string, string> = {};
    for (const line of template.split("\n")) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (match?.[1]) {
        parsedTemplate[match[1]] = (match[2] ?? "").replace(/^"(.*)"$/, "$1");
      }
    }
    const result = envSchema.safeParse({
      ...parsedTemplate,
      DISCORD_APPLICATION_BOT_TOKEN: "token-123",
      OWNER_ID: "100000000000000999",
      MAIN_CHANNEL_ID: "100000000000000200",
    });
    expect(result.success ? true : result.error.flatten().fieldErrors).toBe(true);
  });
});

describe("seedEnvSchema", () => {
  it("should parse with only DATABASE_URL and OWNER_ID", () => {
    const result = seedEnvSchema.safeParse({
      DATABASE_URL: "postgres://user:pass@localhost:5432/testdb",
      OWNER_ID: "100000000000000999",
    });
    expect(result.success).toBe(true);
  });

  it("should still require a valid OWNER_ID", () => {
    const result = seedEnvSchema.safeParse({ DATABASE_URL: "postgres://user:pass@localhost:5432/testdb" });
    expect(result.success).toBe(false);
  });
});
