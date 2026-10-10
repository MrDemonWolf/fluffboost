import sinon from "sinon";
import type { SinonStub } from "sinon";
import type { z } from "zod";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";

import type { envSchema } from "../src/utils/envSchema.js";

/**
 * Shared test helper factories for FluffBoost tests.
 * Provides lightweight mock objects for Discord.js, Drizzle, and Logger.
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
export interface MockDbChain extends PromiseLike<unknown> {
  from: SinonStub;
  where: SinonStub;
  orderBy: SinonStub;
  limit: SinonStub;
  offset: SinonStub;
  set: SinonStub;
  values: SinonStub;
  onConflictDoNothing: SinonStub;
  returning: SinonStub;
  target: SinonStub;
  /** Make the awaited chain resolve to `value` (clears a configured rejection). */
  resolves(value: unknown): MockDbChain;
  /** Make the awaited chain reject with `err`. */
  rejects(err: unknown): MockDbChain;
}

export function mockDbChain(resolveValue: unknown = []): MockDbChain {
  let _resolveValue: unknown = resolveValue;
  let _rejectValue: unknown = undefined;

  // Every builder method returns the chain itself, like Drizzle's query builder.
  const builder = () => sinon.stub().callsFake(() => chain);

  const chain: MockDbChain = {
    from: builder(),
    where: builder(),
    orderBy: builder(),
    limit: builder(),
    offset: builder(),
    set: builder(),
    values: builder(),
    onConflictDoNothing: builder(),
    returning: builder(),
    target: builder(),
    // Make the chain thenable so `await db.select().from(...)` works
    then<TResult1 = unknown, TResult2 = never>(
      onFulfill?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
      onReject?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
    ): PromiseLike<TResult1 | TResult2> {
      if (_rejectValue !== undefined) {
        return Promise.reject(_rejectValue).then(onFulfill, onReject);
      }
      return Promise.resolve(_resolveValue).then(onFulfill, onReject);
    },
    // Test configuration helpers
    resolves(value: unknown) {
      _resolveValue = value;
      _rejectValue = undefined;
      return chain;
    },
    rejects(err: unknown) {
      _rejectValue = err;
      return chain;
    },
  };

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

// ── Discord.js mocks ─────────────────────────────────────────────────────────

export function mockInteraction(overrides: Record<string, unknown> = {}) {
  const entitlements = new Map<string, { skuId: string }>();
  const replyStub = sinon.stub().resolves();
  const followUpStub = sinon.stub().resolves();
  const editReplyStub = sinon.stub().resolves();
  const deferReplyStub = sinon.stub().callsFake(async function (this: { deferred: boolean }) {
    this.deferred = true;
  });

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
    deferReply: deferReplyStub,
    editReply: editReplyStub,
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

export type MockEnv = z.infer<typeof envSchema>;

/** The unit-test env overrides tests/preload.ts registers (unreachable hosts, fake credentials). */
export const UNIT_ENV_FIXTURE: Partial<MockEnv> = {
  DATABASE_URL: "postgres://unit:unit@127.0.0.1:1/fluffboost_unit",
  REDIS_URL: "redis://127.0.0.1:1",
  DISCORD_APPLICATION_PUBLIC_KEY: "unit-test-not-a-discord-public-key",
  DISCORD_APPLICATION_BOT_TOKEN: "unit-test-not-a-discord-token",
};

/** A fully typed env fixture; overrides must match the real schema's output types. */
export function mockEnv(overrides: Partial<MockEnv> = {}): MockEnv {
  return {
    DATABASE_URL: "postgres://user:pass@localhost:5432/test",
    DATABASE_POOL_MAX: 10,
    DATABASE_QUERY_LOG: false,
    REDIS_URL: "redis://localhost:6379",
    DISCORD_APPLICATION_ID: "100000000000000001",
    DISCORD_APPLICATION_PUBLIC_KEY: "key-123",
    DISCORD_APPLICATION_BOT_TOKEN: "token-123",
    DISCORD_DEFAULT_STATUS: "Spreading Paw-sitivity",
    DISCORD_DEFAULT_ACTIVITY_TYPE: "Custom",
    DEFAULT_ACTIVITY_URL: undefined,
    DISCORD_ACTIVITY_INTERVAL_MINUTES: 15,
    ALLOWED_USERS: "100000000000000123,100000000000000456",
    OWNER_ID: "100000000000000999",
    MAIN_GUILD_ID: "100000000000000100",
    MAIN_CHANNEL_ID: "100000000000000200",
    HOST: "localhost",
    PORT: 3000,
    VERSION: "1.0.0",
    NODE_ENV: "test",
    PREMIUM_ENABLED: false,
    DISCORD_PREMIUM_SKU_ID: undefined,
    WORKER_CONCURRENCY: 4,
    ...overrides,
  };
}

// ── Utility types for stubs ──────────────────────────────────────────────────

export type MockLogger = ReturnType<typeof mockLogger>;
export type MockDb = ReturnType<typeof mockDb>;
export type StubFn = SinonStub;

// ── Premium upsell stub (matches real premium.buildPremiumUpsell shape) ────

export function stubBuildPremiumUpsell(skuId?: string) {
  type UpsellField = { name: string; value: string; inline?: boolean };
  return (opts: { title?: string; description?: string; fields?: UpsellField[] } = {}) => {
    const embed = new EmbedBuilder()
      .setColor(0xfadb7f)
      .setTitle(opts.title ?? "FluffBoost Premium")
      .setDescription(opts.description ?? "upsell");
    if (opts.fields) {
      embed.addFields(opts.fields);
    }
    const components: ActionRowBuilder<ButtonBuilder>[] = [];
    if (skuId) {
      components.push(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setStyle(ButtonStyle.Premium).setSKUId(skuId)
        )
      );
    }
    return { embeds: [embed], components };
  };
}
