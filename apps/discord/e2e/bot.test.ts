import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { Client, ChannelType, Collection, MessageFlags, PermissionFlagsBits } from "discord.js";
import type { Client as DiscordClient, Entitlement, Interaction } from "discord.js";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import sinon from "sinon";
import { guilds, motivationQuotes } from "../src/database/schema.js";
import { mockClient, mockEnv, mockInteraction, mockLogger } from "../tests/helpers.js";
import { requireSafeE2EDatabaseUrl } from "./databaseSafety.js";

// Never fall back to DATABASE_URL or the bot's .env credentials.
const databaseUrl = requireSafeE2EDatabaseUrl(
  process.env["E2E_DATABASE_URL"],
  process.env["E2E_DATABASE_DISPOSABLE"],
);

const schemaName = `fluffboost_e2e_${crypto.randomUUID().replaceAll("-", "")}`;
const connection = postgres(databaseUrl, {
  max: 4, connect_timeout: 5, connection: { search_path: schemaName }, onnotice: () => {},
});
const db = drizzle(connection);
const logger = mockLogger();
const skuId = "100000000000000777";
const guildId = "100000000000000111";
const channelId = "100000000000000222";
const env = mockEnv({ PREMIUM_ENABLED: true, DISCORD_PREMIUM_SKU_ID: skuId });
mock.module("../src/database/index.js", () => ({ db, queryClient: connection }));
mock.module("../src/utils/logger.js", () => ({ default: logger }));
mock.module("../src/utils/env.js", () => ({ default: env }));
// Redis is outside this suite: without this, importing the command registry
// (via /suggestion's rate limiter) would open real ioredis clients to
// env.REDIS_URL. Redis-backed behavior is covered by suggestionLimits.test.ts.
mock.module("../src/redis/index.js", () => ({
  default: {
    eval: sinon.stub().resolves(1),
    ping: sinon.stub().resolves("PONG"),
    quit: sinon.stub().resolves("OK"),
  },
  bullRedis: {},
}));

// Keep actual routing, handlers, validators, SQL queries, embeds and scheduler.
const { interactionCreateEvent } = await import("../src/events/interactionCreate.js");
const { entitlementCreateEvent } = await import("../src/events/entitlementCreate.js");
const { entitlementDeleteEvent } = await import("../src/events/entitlementDelete.js");
const { entitlementUpdateEvent } = await import("../src/events/entitlementUpdate.js");
const { default: sendMotivation } = await import("../src/worker/jobs/sendMotivation.js");
let clock: sinon.SinonFakeTimers;
let schemaCreated = false;

function makeEntitlement(overrides: Partial<Pick<Entitlement,
  "id" | "guildId" | "skuId" | "startsAt" | "endsAt" | "deleted" | "client"
>> & { isTest?: () => boolean } = {}): Entitlement {
  return {
    id: "100000000000000888", skuId, guildId,
    startsAt: new Date("2026-01-01T00:00:00Z"), endsAt: new Date("2027-01-01T00:00:00Z"),
    deleted: false, isTest: () => false, client: mockClient() as unknown as DiscordClient, ...overrides,
  } as Entitlement;
}

function makeInteraction(commandName = "setup", subcommand = "channel", entitled = false) {
  const interaction = Object.assign(mockInteraction(), {
    guildId, commandName,
    memberPermissions: { has: (permission: bigint) => permission === PermissionFlagsBits.Administrator },
    entitlements: new Collection(entitled ? [["entitlement", makeEntitlement()]] : []),
  });
  interaction.options.getSubcommand.returns(subcommand);
  interaction.options.getChannel.returns({ id: channelId });
  return interaction;
}

function makeTransport() {
  const channel = {
    id: channelId, guildId, type: ChannelType.GuildText,
    isTextBased: () => true, isDMBased: () => false,
    permissionsFor: () => ({ has: () => true }), send: sinon.stub().resolves(),
  };
  const client = mockClient();
  client.channels.fetch.resolves(channel);
  client.application.entitlements.createTest.rejects(new Error("Discord mutations are forbidden in E2E"));
  client.application.entitlements.deleteTest.rejects(new Error("Discord mutations are forbidden in E2E"));
  return { client: client as unknown as DiscordClient, channel };
}

async function route(client: DiscordClient, interaction: ReturnType<typeof makeInteraction>) {
  await interactionCreateEvent(client, interaction as unknown as Interaction);
}

beforeAll(async () => {
  await connection`CREATE SCHEMA ${connection(schemaName)}`;
  schemaCreated = true;
  const [current] = await connection`SELECT current_schema() AS name`;
  expect(current?.["name"]).toBe(schemaName);
  const journal = JSON.parse(await readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"));
  for (const entry of journal.entries as { tag: string }[]) {
    const migration = await readFile(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url), "utf8");
    // Migrations qualify enum creation as public; remap to this run's schema.
    for (const statement of migration.replaceAll('"public".', `"${schemaName}".`).split("--> statement-breakpoint")) {
      if (statement.trim()) {
        await connection.unsafe(statement);
      }
    }
  }
}, 20_000);

beforeEach(async () => {
  await db.delete(guilds);
  await db.delete(motivationQuotes);
  await db.insert(motivationQuotes).values({
    quote: "One small step still moves you forward.", author: "FluffBoost E2E", addedBy: "100000000000000333",
  });
  clock = sinon.useFakeTimers({ now: new Date("2026-10-03T13:00:00Z"), toFake: ["Date"] });
});

afterEach(() => {
  clock?.restore();
  env.NODE_ENV = "test";
});
afterAll(async () => {
  if (schemaCreated) {
    await connection`DROP SCHEMA ${connection(schemaName)} CASCADE`;
  }
  await connection.end();
});

describe("bot E2E with real PostgreSQL and local Discord transport", () => {
  test("setup persists defaults and concurrent worker ticks deliver exactly once", async () => {
    const { client, channel } = makeTransport();
    const interaction = makeInteraction();
    await route(client, interaction);
    expect(interaction.reply.firstCall.args[0].content).toContain(channelId);
    const [saved] = await db.select().from(guilds);
    expect(saved?.motivationChannelId).toBe(channelId);
    expect(saved?.motivationTime).toBe("08:00");
    expect(saved?.timezone).toBe("America/Chicago");

    await Promise.all([sendMotivation(client), sendMotivation(client)]);
    await sendMotivation(client);
    expect(channel.send.callCount).toBe(1);
    expect(channel.send.firstCall.args[0].embeds[0].data.description).toContain("One small step");
    const [delivered] = await db.select().from(guilds);
    expect(delivered?.lastMotivationSentAt?.toISOString()).toBe("2026-10-03T13:00:00.000Z");
  });

  test("non-admin setup and unsubscribed customization do not change saved settings", async () => {
    const { client } = makeTransport();
    const denied = makeInteraction();
    denied.memberPermissions = { has: () => false };
    await route(client, denied);
    expect(denied.reply.firstCall.args[0].content).toContain("Administrator");
    expect(await db.select().from(guilds)).toHaveLength(0);

    await route(client, makeInteraction());
    const schedule = makeInteraction("setup", "schedule");
    schedule.options.getString.withArgs("time").returns("22:00");
    await route(client, schedule);
    expect(schedule.reply.firstCall.args[0].flags).toBe(MessageFlags.Ephemeral);
    expect(schedule.reply.firstCall.args[0].components[0].components[0].data.sku_id).toBe(skuId);
    expect((await db.select().from(guilds))[0]?.motivationTime).toBe("08:00");
  });

  test("an active server subscription enables scheduling; expiry restores free delivery and retains customization", async () => {
    const { client, channel } = makeTransport();
    await route(client, makeInteraction());
    await entitlementCreateEvent(makeEntitlement());
    const schedule = makeInteraction("setup", "schedule", true);
    schedule.options.getString.withArgs("time").returns("22:00");
    schedule.options.getString.withArgs("timezone").returns("Europe/London");
    await route(client, schedule);
    expect(schedule.reply.firstCall.args[0].embeds[0].data.title).toBe("Schedule Updated");
    await sendMotivation(client);
    expect(channel.send.called).toBe(false);

    await entitlementCreateEvent(makeEntitlement({ skuId: "unrelated-sku" }));
    expect((await db.select().from(guilds))[0]?.isPremium).toBe(true);
    await entitlementUpdateEvent(null, makeEntitlement({ endsAt: new Date("2026-10-03T12:59:00Z") }));
    await sendMotivation(client);
    expect(channel.send.calledOnce).toBe(true);
    const [saved] = await db.select().from(guilds);
    expect(saved?.isPremium).toBe(false);
    expect(saved?.motivationTime).toBe("22:00");
    expect(saved?.timezone).toBe("Europe/London");
  });

  test("expired, revoked, unrelated and production test entitlements cannot unlock scheduling", async () => {
    const { client } = makeTransport();
    await route(client, makeInteraction());
    const invalid = [
      makeEntitlement({ endsAt: new Date("2026-10-03T12:59:00Z") }),
      makeEntitlement({ deleted: true }),
      makeEntitlement({ skuId: "another-sku" }),
      makeEntitlement({ guildId: "100000000000000999" }),
      makeEntitlement({ guildId: null }),
      makeEntitlement({ startsAt: null, endsAt: null, isTest: () => true }),
    ];
    env.NODE_ENV = "production";
    for (const entitlement of invalid) {
      const interaction = makeInteraction("setup", "schedule", true);
      interaction.entitlements.set("entitlement", entitlement);
      interaction.options.getString.withArgs("time").returns("22:00");
      await route(client, interaction);
      expect(interaction.reply.firstCall.args[0].embeds[0].data.title).toBe("Premium Feature");
      expect((await db.select().from(guilds))[0]?.motivationTime).toBe("08:00");
    }
  });

  test("production test events and revoking one grant preserve another paid subscription", async () => {
    const { client } = makeTransport();
    await route(client, makeInteraction());
    await entitlementCreateEvent(makeEntitlement());
    env.NODE_ENV = "production";
    const testEntitlement = makeEntitlement({ startsAt: null, endsAt: null, isTest: () => true });
    await entitlementCreateEvent(testEntitlement);
    await entitlementUpdateEvent(null, testEntitlement);
    await entitlementDeleteEvent(testEntitlement);
    expect((await db.select().from(guilds))[0]?.isPremium).toBe(true);

    const entitlementClient = mockClient();
    const remaining = makeEntitlement({
      id: "100000000000000999", client: entitlementClient as unknown as DiscordClient<true>,
    });
    // Honor the pagination cursor: the walk stops only on an empty page.
    entitlementClient.application.entitlements.fetch.callsFake(async ({ after }: { after?: string }) =>
      after === "0" ? new Collection([[remaining.id, remaining]]) : new Collection());
    await entitlementDeleteEvent(makeEntitlement({ client: entitlementClient as unknown as DiscordClient<true> }));
    expect((await db.select().from(guilds))[0]?.isPremium).toBe(true);
    entitlementClient.application.entitlements.fetch.resolves(new Collection());
    await entitlementDeleteEvent(remaining);
    expect((await db.select().from(guilds))[0]?.isPremium).toBe(false);
  });

  test("failed delivery releases its SQL claim so the next tick retries once", async () => {
    const { client, channel } = makeTransport();
    await route(client, makeInteraction());
    channel.send.onFirstCall().rejects(new Error("temporary Discord transport failure"));
    await sendMotivation(client);
    expect((await db.select().from(guilds))[0]?.lastMotivationSentAt).toBeNull();
    await sendMotivation(client);
    await sendMotivation(client);
    expect(channel.send.callCount).toBe(2);
    expect((await db.select().from(guilds))[0]?.lastMotivationSentAt).not.toBeNull();
  });

  test("a shard without the target guild in cache still sends through real Discord.js channel resolution", async () => {
    await db.insert(guilds).values({ guildId, motivationChannelId: channelId });
    const client = new Client({ intents: [] });
    sinon.stub(client.users, "fetch").resolves({
      username: "E2E curator", displayAvatarURL: () => "https://example.com/avatar.png",
    } as never);
    sinon.stub(client.rest, "get").resolves({
      id: channelId, type: ChannelType.GuildText, guild_id: guildId, name: "quotes",
      permission_overwrites: [], position: 0,
    });
    const send = sinon.stub(client.rest, "post").callsFake(async (_route, options) => ({
      id: "100000000000000444", channel_id: channelId, guild_id: guildId, type: 0, content: "",
      author: {
        id: "100000000000000555", username: "FluffBoost", discriminator: "0000", avatar: null, bot: true,
      },
      embeds: (options?.body as { embeds?: unknown[] } | undefined)?.embeds ?? [], attachments: [],
      timestamp: new Date().toISOString(), edited_timestamp: null, tts: false,
      mention_everyone: false, mentions: [], mention_roles: [], pinned: false,
    }));
    try {
      expect(client.guilds.cache.has(guildId)).toBe(false);
      await sendMotivation(client);
      expect(send.calledOnce).toBe(true);
      // An empty-body regression would otherwise pass as a send with no quote.
      const body = send.firstCall.args[1]?.body as { embeds?: unknown[] } | undefined;
      expect(body?.embeds).toHaveLength(1);
      expect((await db.select().from(guilds))[0]?.lastMotivationSentAt).not.toBeNull();
    } finally {
      await client.destroy();
    }
  });
});
