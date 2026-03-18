import sinon from "sinon";
import type { SinonStub } from "sinon";

/**
 * Shared test helper factories for FluffBoost tests.
 * Provides lightweight mock objects for Discord.js, Drizzle, Logger, and PostHog.
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

// ── Drizzle DB mock ─────────────────────────────────────────────────────────

/**
 * Creates a chainable mock that simulates Drizzle's query builder.
 * All chaining methods (from, where, orderBy, etc.) return `this`.
 * When `await`ed, resolves to the configured value (default: []).
 *
 * Usage in tests:
 *   const chain = mockDbChain([{ guildId: "g1" }]);
 *   db.select.returns(chain);
 *   // When source code does: await db.select().from(guilds).where(...)
 *   // It resolves to [{ guildId: "g1" }]
 *
 * For error cases:
 *   const chain = mockDbChain();
 *   chain.rejects(new Error("DB error"));
 */
export function mockDbChain(resolveValue: unknown = []) {
  let _resolveValue: unknown = resolveValue;
  let _rejectValue: unknown = undefined;

  const chain: Record<string, unknown> = {};
  const methods = [
    "from", "where", "orderBy", "limit", "offset",
    "set", "values", "onConflictDoNothing", "returning", "target",
  ];

  for (const method of methods) {
    chain[method] = sinon.stub().returns(chain);
  }

  // Make the chain thenable so `await db.select().from(...)` works
  chain.then = (onFulfill: (v: unknown) => unknown, onReject?: (e: unknown) => unknown) => {
    if (_rejectValue !== undefined) {
      return Promise.reject(_rejectValue).then(onFulfill, onReject);
    }
    return Promise.resolve(_resolveValue).then(onFulfill, onReject);
  };

  // Test configuration helpers
  chain.resolves = (value: unknown) => { _resolveValue = value; _rejectValue = undefined; return chain; };
  chain.rejects = (err: unknown) => { _rejectValue = err; return chain; };

  return chain;
}

/**
 * Creates a mock for Drizzle's `db` object.
 * Each method (select, insert, update, delete) returns a fresh chainable mock by default.
 * Use sinon's `.returns()` or `.onCall(n).returns()` to configure specific chain results.
 *
 * Example:
 *   const db = mockDb();
 *   db.select.returns(mockDbChain([{ guildId: "g1" }]));
 *   db.insert.returns(mockDbChain([{ id: "new-id" }]));
 */
export function mockDb() {
  return {
    select: sinon.stub().callsFake(() => mockDbChain([])),
    insert: sinon.stub().callsFake(() => mockDbChain([])),
    update: sinon.stub().callsFake(() => mockDbChain([])),
    delete: sinon.stub().callsFake(() => mockDbChain()),
    transaction: sinon.stub().callsFake(async (fn: (tx: ReturnType<typeof mockDb>) => Promise<unknown>) => {
      const tx = mockDb();
      return fn(tx);
    }),
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
        fetch: sinon.stub().resolves(new Map()),
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
export type MockDb = ReturnType<typeof mockDb>;
export type MockPosthog = ReturnType<typeof mockPosthog>;
export type StubFn = SinonStub;
