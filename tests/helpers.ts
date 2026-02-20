import sinon from "sinon";
import type { SinonStub } from "sinon";

/**
 * Shared test helper factories for FluffBoost tests.
 * Provides lightweight mock objects for Discord.js, Prisma, Logger, and PostHog.
 */

// ── Logger mock ──────────────────────────────────────────────────────────────

export function mockLogger() {
  return {
    success: sinon.stub(),
    info: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
    debug: sinon.stub(),
    ready: sinon.stub(),
    unauthorized: sinon.stub(),
    commands: {
      executing: sinon.stub(),
      success: sinon.stub(),
      error: sinon.stub(),
      warn: sinon.stub(),
      unauthorized: sinon.stub(),
    },
    database: {
      connected: sinon.stub(),
      error: sinon.stub(),
      operation: sinon.stub(),
    },
    api: {
      started: sinon.stub(),
      error: sinon.stub(),
      request: sinon.stub(),
    },
    discord: {
      shardLaunched: sinon.stub(),
      shardError: sinon.stub(),
      ready: sinon.stub(),
      guildJoined: sinon.stub(),
      guildLeft: sinon.stub(),
    },
  };
}

// ── Prisma mock ──────────────────────────────────────────────────────────────

export function mockPrisma() {
  return {
    $transaction: sinon.stub().callsFake((promises: Promise<unknown>[]) => Promise.all(promises)),
    guild: {
      findMany: sinon.stub().resolves([]),
      findUnique: sinon.stub().resolves(null),
      create: sinon.stub().resolves({ guildId: "test-guild" }),
      update: sinon.stub().resolves({ guildId: "test-guild" }),
      upsert: sinon.stub().resolves({ guildId: "test-guild" }),
      delete: sinon.stub().resolves({ guildId: "test-guild" }),
      count: sinon.stub().resolves(0),
    },
    motivationQuote: {
      findMany: sinon.stub().resolves([]),
      findUnique: sinon.stub().resolves(null),
      count: sinon.stub().resolves(0),
      create: sinon.stub().resolves({}),
      delete: sinon.stub().resolves({}),
    },
    discordActivity: {
      findMany: sinon.stub().resolves([]),
      findUnique: sinon.stub().resolves(null),
      create: sinon.stub().resolves({}),
      delete: sinon.stub().resolves({}),
    },
    suggestionQuote: {
      findMany: sinon.stub().resolves([]),
      findUnique: sinon.stub().resolves(null),
      create: sinon.stub().resolves({}),
      update: sinon.stub().resolves({}),
      updateMany: sinon.stub().resolves({ count: 0 }),
      count: sinon.stub().resolves(0),
    },
  };
}

// ── PostHog mock ─────────────────────────────────────────────────────────────

export function mockPosthog() {
  return {
    capture: sinon.stub(),
    shutdown: sinon.stub(),
  };
}

// ── Discord.js mocks ─────────────────────────────────────────────────────────

export function mockInteraction(overrides: Record<string, unknown> = {}) {
  const entitlements = new Map<string, { skuId: string }>();
  const replyStub = sinon.stub().resolves();
  const followUpStub = sinon.stub().resolves();

  return {
    user: {
      id: "user-123",
      username: "testuser",
      displayAvatarURL: sinon.stub().returns("https://example.com/avatar.png"),
    },
    guildId: "guild-123",
    replied: false,
    deferred: false,
    reply: replyStub,
    followUp: followUpStub,
    entitlements,
    isCommand: sinon.stub().returns(true),
    isChatInputCommand: sinon.stub().returns(true),
    isAutocomplete: sinon.stub().returns(false),
    commandName: "test",
    options: {
      getString: sinon.stub().returns(null),
      getInteger: sinon.stub().returns(null),
      getChannel: sinon.stub().returns(null),
      getSubcommandGroup: sinon.stub().returns(null),
      getSubcommand: sinon.stub().returns(null),
      getFocused: sinon.stub().returns({ name: "", value: "" }),
    },
    ...overrides,
  };
}

export function mockClient(overrides: Record<string, unknown> = {}) {
  return {
    user: {
      id: "bot-123",
      username: "FluffBoost",
      displayAvatarURL: sinon.stub().returns("https://example.com/avatar.png"),
      setActivity: sinon.stub(),
    },
    guilds: {
      cache: new Map(),
    },
    channels: {
      fetch: sinon.stub().resolves(null),
    },
    users: {
      fetch: sinon.stub().resolves({
        username: "testuser",
        displayAvatarURL: sinon.stub().returns("https://example.com/avatar.png"),
      }),
    },
    application: {
      entitlements: {
        createTest: sinon.stub().resolves({ id: "ent-123", skuId: "sku-123" }),
        deleteTest: sinon.stub().resolves(),
      },
    },
    ...overrides,
  };
}

export function mockGuild(overrides: Record<string, unknown> = {}) {
  return {
    id: "guild-123",
    name: "Test Guild",
    memberCount: 42,
    ...overrides,
  };
}

export function mockEntitlement(overrides: Record<string, unknown> = {}) {
  return {
    id: "ent-123",
    userId: "user-123",
    skuId: "sku-123",
    guildId: "guild-123",
    endsAt: null,
    ...overrides,
  };
}

// ── Default env mock ─────────────────────────────────────────────────────────

export function mockEnv(overrides: Record<string, unknown> = {}) {
  return {
    DATABASE_URL: "postgres://user:pass@localhost:5432/test",
    REDIS_URL: "redis://localhost:6379",
    DISCORD_APPLICATION_ID: "app-123",
    DISCORD_APPLICATION_PUBLIC_KEY: "key-123",
    DISCORD_APPLICATION_BOT_TOKEN: "token-123",
    DISCORD_DEFAULT_STATUS: "Spreading Paw-sitivity",
    DISCORD_DEFAULT_ACTIVITY_TYPE: "Custom",
    DEFAULT_ACTIVITY_URL: undefined,
    DISCORD_ACTIVITY_INTERVAL_MINUTES: 15,
    DISCORD_DEFAULT_MOTIVATIONAL_DAILY_TIME: "0 8 * * *",
    ALLOWED_USERS: "user-123, user-456",
    OWNER_ID: "owner-123",
    MAIN_GUILD_ID: "main-guild-123",
    MAIN_CHANNEL_ID: "main-channel-123",
    POSTHOG_API_KEY: "phk_test",
    POSTHOG_HOST: "https://posthog.test",
    HOST: "localhost",
    PORT: "3000",
    CORS_ORIGIN: "*",
    VERSION: "1.0.0",
    NODE_ENV: "test",
    PREMIUM_ENABLED: false,
    DISCORD_PREMIUM_SKU_ID: undefined,
    ...overrides,
  };
}

// ── Utility types for stubs ──────────────────────────────────────────────────

export type MockLogger = ReturnType<typeof mockLogger>;
export type MockPrisma = ReturnType<typeof mockPrisma>;
export type MockPosthog = ReturnType<typeof mockPosthog>;
export type StubFn = SinonStub;
