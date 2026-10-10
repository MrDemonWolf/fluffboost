import { describe, it, expect, afterEach } from "bun:test";
import sinon from "sinon";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { mockLogger, mockDb, mockDbChain, mockClient } from "../helpers.js";
import {
  DELIVERY_CHUNK_SIZE, deliveryNonce, sendMotivationCore,
} from "../../src/worker/jobs/sendMotivationCore.js";
import type { SendMotivationDeps } from "../../src/worker/jobs/sendMotivationCore.js";

/**
 * Tests inject deps directly (mirroring setActivityCore) instead of
 * mock.module(), which is process-global in bun:test and made this file's
 * results depend on cross-file execution order.
 */
describe("sendMotivation", () => {
  afterEach(() => {
    sinon.restore();
  });

  function makeDeps(overrides: Partial<Record<keyof SendMotivationDeps, unknown>> = {}) {
    const db = (overrides.db as ReturnType<typeof mockDb>) ?? mockDb();
    const logger = (overrides.logger as ReturnType<typeof mockLogger>) ?? mockLogger();
    const dueOccurrence =
      (overrides.dueOccurrence as sinon.SinonStub) ?? sinon.stub().returns(new Date(Date.now() - 60_000));
    const getRandomMotivationQuote =
      (overrides.getRandomMotivationQuote as sinon.SinonStub) ??
      sinon.stub().resolves({ id: "q1", quote: "Stay strong", author: "Author", addedBy: "u1", createdAt: new Date() });
    const resolveQuoteAuthor =
      (overrides.resolveQuoteAuthor as sinon.SinonStub) ??
      sinon.stub().resolves({ username: "authoruser", displayAvatarURL: () => "https://x/avatar.png" });
    const buildMotivationEmbed = (overrides.buildMotivationEmbed as sinon.SinonStub) ?? sinon.stub().returns({});

    const deps = {
      db,
      logger,
      dueOccurrence,
      getRandomMotivationQuote,
      resolveQuoteAuthor,
      buildMotivationEmbed,
    };
    return { deps: deps as unknown as SendMotivationDeps, db, logger, dueOccurrence };
  }

  function configureAllGuildsQuery(db: ReturnType<typeof mockDb>, rows: unknown[]) {
    db.select.onCall(0).returns(mockDbChain(rows));
  }

  const guildRow = (overrides: Record<string, unknown> = {}) => ({
    id: "uuid1",
    guildId: "g1",
    motivationChannelId: "ch1",
    timezone: "UTC",
    motivationFrequency: "Daily",
    lastMotivationSentAt: null,
    ...overrides,
  });

  it("should return early when no guilds have channels configured", async () => {
    const { deps, db } = makeDeps();
    configureAllGuildsQuery(db, []);

    await sendMotivationCore(mockClient() as never, deps);
    expect(db.select.callCount).toBe(1);
    expect(db.update.called).toBe(false);
  });

  it("should return early when no guilds are due", async () => {
    const { deps, db } = makeDeps({ dueOccurrence: sinon.stub().returns(null) });
    configureAllGuildsQuery(db, [guildRow()]);

    await sendMotivationCore(mockClient() as never, deps);
    expect(db.update.called).toBe(false);
  });

  it("should warn and return when motivation table is empty", async () => {
    const { deps, db, logger } = makeDeps({ getRandomMotivationQuote: sinon.stub().resolves(null) });
    configureAllGuildsQuery(db, [guildRow()]);

    await sendMotivationCore(mockClient() as never, deps);

    expect(logger.warn.called).toBe(true);
    expect(db.update.called).toBe(false);
  });

  it("should atomically claim guild before sending and send embed on success", async () => {
    const { deps, db } = makeDeps();
    configureAllGuildsQuery(db, [guildRow()]);
    // claimGuild update returns a row — we won the claim.
    db.update.returns(mockDbChain([{ id: "uuid1" }]));

    const sendStub = sinon.stub().resolves();
    const channel = { isTextBased: () => true, isDMBased: () => false, send: sendStub };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    await sendMotivationCore(client as never, deps);

    expect(db.update.calledOnce).toBe(true);
    expect(sendStub.calledOnce).toBe(true);
  });

  it("should skip send when another worker already claimed the guild (race)", async () => {
    const { deps, db } = makeDeps();
    configureAllGuildsQuery(db, [guildRow()]);
    // Empty returning() — another worker won the race first.
    db.update.returns(mockDbChain([]));

    const sendStub = sinon.stub().resolves();
    const channel = { isTextBased: () => true, isDMBased: () => false, send: sendStub };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    await sendMotivationCore(client as never, deps);

    expect(sendStub.called).toBe(false);
  });

  it("should skip guilds with invalid channels after winning claim", async () => {
    const { deps, db, logger } = makeDeps();
    configureAllGuildsQuery(db, [guildRow()]);
    db.update.returns(mockDbChain([{ id: "uuid1" }]));

    const channel = { isTextBased: () => false, isDMBased: () => false, send: sinon.stub() };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    await sendMotivationCore(client as never, deps);

    expect(channel.send.called).toBe(false);
    expect(logger.warn.called).toBe(true);
    // Invalid channel keeps the claim — exactly one update (the claim itself).
    expect(db.update.calledOnce).toBe(true);
  });

  it("should release the claim when the send fails so the next tick can retry", async () => {
    const { deps, db, logger } = makeDeps();
    const prior = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    configureAllGuildsQuery(db, [guildRow({ lastMotivationSentAt: prior })]);
    const claimChain = mockDbChain([{ id: "uuid1" }]);
    const releaseChain = mockDbChain();
    db.update.onCall(0).returns(claimChain);
    db.update.onCall(1).returns(releaseChain);

    const sendStub = sinon.stub().rejects(new Error("Discord 5xx"));
    const channel = { isTextBased: () => true, isDMBased: () => false, send: sendStub };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    await sendMotivationCore(client as never, deps);

    // First update = claim, second update = release.
    expect(db.update.callCount).toBe(2);
    expect(logger.error.called).toBe(true);
    const claimedAt = claimChain.set.firstCall.args[0].lastMotivationSentAt as Date;
    expect(claimedAt).toBeInstanceOf(Date);
    // The release restores the guild's previous value, not null.
    expect(releaseChain.set.firstCall.args[0]).toEqual({ lastMotivationSentAt: prior });
    // ...and only while the row still carries this worker's claim timestamp.
    const { sql, params } = new PgDialect().sqlToQuery(releaseChain.where.firstCall.args[0] as SQL);
    expect(sql).toBe('("Guild"."id" = $1 and "Guild"."lastMotivationSentAt" = $2)');
    expect(params).toEqual(["uuid1", claimedAt.toISOString()]);
  });

  it("should keep the claim on permanent Discord errors (Unknown Channel)", async () => {
    const { deps, db, logger } = makeDeps();
    configureAllGuildsQuery(db, [guildRow()]);
    db.update.returns(mockDbChain([{ id: "uuid1" }]));

    const client = mockClient();
    const unknownChannel = Object.assign(new Error("Unknown Channel"), { code: 10003, status: 404 });
    (client.channels.fetch as sinon.SinonStub).rejects(unknownChannel);

    await sendMotivationCore(client as never, deps);

    // Claim only — no release, so the config problem isn't retried every tick.
    expect(db.update.callCount).toBe(1);
    expect(logger.warn.called).toBe(true);
  });

  it("should isolate per-guild send failures via Promise.allSettled", async () => {
    const { deps, db, logger } = makeDeps();
    configureAllGuildsQuery(db, [guildRow(), guildRow({ id: "uuid2", guildId: "g2", motivationChannelId: "ch2" })]);
    db.update.returns(mockDbChain([{ id: "uuid1" }]));

    const sendStub = sinon.stub();
    sendStub.onFirstCall().rejects(new Error("channel error"));
    sendStub.onSecondCall().resolves();
    const channel = { isTextBased: () => true, isDMBased: () => false, send: sendStub };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    await sendMotivationCore(client as never, deps);

    expect(logger.error.called).toBe(true);
    expect(sendStub.calledTwice).toBe(true);
  });

  it("should tolerate user fetch failure for addedBy", async () => {
    const { deps, db } = makeDeps({ resolveQuoteAuthor: sinon.stub().resolves(null) });
    configureAllGuildsQuery(db, [guildRow()]);
    db.update.returns(mockDbChain([{ id: "uuid1" }]));

    const sendStub = sinon.stub().resolves();
    const channel = { isTextBased: () => true, isDMBased: () => false, send: sendStub };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    await sendMotivationCore(client as never, deps);

    expect(sendStub.calledOnce).toBe(true);
  });
  /** A DiscordAPIError-shaped rejection (duck-typed like the worker does). */
  const discordError = (status: number, code: number | string, message = "Discord error") =>
    Object.assign(new Error(message), { status, code });

  const textChannel = (send: sinon.SinonStub) => ({ isTextBased: () => true, isDMBased: () => false, send });

  const manyGuilds = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      guildRow({ id: `uuid${i}`, guildId: `g${i}`, motivationChannelId: `ch${i}` }));

  it("fetches the channel with allowUnknownGuild so cross-shard channels resolve", async () => {
    const { deps, db } = makeDeps();
    configureAllGuildsQuery(db, [guildRow()]);
    db.update.returns(mockDbChain([{ id: "uuid1" }]));
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(textChannel(sinon.stub().resolves()));

    await sendMotivationCore(client as never, deps);

    expect((client.channels.fetch as sinon.SinonStub).firstCall.args).toEqual(["ch1", { allowUnknownGuild: true }]);
  });

  it("sends with a deterministic nonce and enforceNonce so retries cannot double-post", async () => {
    const occurrence = new Date("2026-10-07T13:00:00Z");
    const { deps, db } = makeDeps({ dueOccurrence: sinon.stub().returns(occurrence) });
    const row = guildRow({ id: "3f2b8c1e-9a4d-4e6f-8b1a-2c3d4e5f6a7b" });
    configureAllGuildsQuery(db, [row]);
    db.update.returns(mockDbChain([{ id: row.id }]));
    const sendStub = sinon.stub().resolves();
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(textChannel(sendStub));

    await sendMotivationCore(client as never, deps);

    const payload = sendStub.firstCall.args[0];
    expect(payload.enforceNonce).toBe(true);
    expect(payload.nonce).toBe(deliveryNonce(row, occurrence));
    expect(payload.nonce.length).toBeLessThanOrEqual(25);
  });

  it("derives nonces that are stable per guild+occurrence and distinct otherwise", () => {
    const occurrence = new Date("2026-10-07T13:00:00Z");
    const a = { id: "3f2b8c1e-9a4d-4e6f-8b1a-2c3d4e5f6a7b" };
    const b = { id: "7c1d2e3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f" };
    expect(deliveryNonce(a, occurrence)).toBe(deliveryNonce(a, new Date(occurrence)));
    expect(deliveryNonce(a, occurrence)).not.toBe(deliveryNonce(b, occurrence));
    expect(deliveryNonce(a, occurrence)).not.toBe(deliveryNonce(a, new Date("2026-10-08T13:00:00Z")));
    expect(deliveryNonce(a, new Date("9999-12-31T23:59:00Z")).length).toBeLessThanOrEqual(25);
  });

  for (const [label, status, code] of [
    ["Missing Permissions", 403, 50013],
    ["Invalid Form Body", 400, 50035],
    ["Missing Access", 403, 50001],
  ] as const) {
    it(`keeps the claim on permanent 4xx rejections (${label} ${code})`, async () => {
      const { deps, db, logger } = makeDeps();
      configureAllGuildsQuery(db, [guildRow()]);
      db.update.returns(mockDbChain([{ id: "uuid1" }]));
      const client = mockClient();
      (client.channels.fetch as sinon.SinonStub).resolves(
        textChannel(sinon.stub().rejects(discordError(status, code, label)))
      );

      await sendMotivationCore(client as never, deps);

      // Claim only — releasing would re-POST every tick for the whole catch-up window.
      expect(db.update.callCount).toBe(1);
      expect(logger.error.called).toBe(false);
      const warnCall = logger.warn.getCalls().find((c) => String(c.args[1]).includes("keeping claim"));
      expect(warnCall?.args[2]).toEqual({ guildId: "g1", channelId: "ch1", code, status });
    });
  }

  for (const [label, err] of [
    ["429 rate limit", discordError(429, 0, "rate limited")],
    ["5xx HTTPError", Object.assign(new Error("Service Unavailable"), { status: 503 })],
    ["network error", Object.assign(new Error("socket hang up"), { code: "ECONNRESET" })],
    ["request timeout", Object.assign(new Error("This operation was aborted"), { name: "AbortError" })],
  ] as const) {
    it(`releases the claim on transient failures (${label})`, async () => {
      const { deps, db } = makeDeps();
      configureAllGuildsQuery(db, [guildRow()]);
      db.update.returns(mockDbChain([{ id: "uuid1" }]));
      const client = mockClient();
      (client.channels.fetch as sinon.SinonStub).resolves(textChannel(sinon.stub().rejects(err)));

      await sendMotivationCore(client as never, deps);

      expect(db.update.callCount).toBe(2);
    });
  }

  it("releases the claim when a send rejects with a non-object reason", async () => {
    const { deps, db, logger } = makeDeps();
    configureAllGuildsQuery(db, [guildRow()]);
    db.update.returns(mockDbChain([{ id: "uuid1" }]));
    const client = mockClient();
    const sendStub = sinon.stub().callsFake(() => Promise.reject(null));
    (client.channels.fetch as sinon.SinonStub).resolves(textChannel(sendStub));

    await sendMotivationCore(client as never, deps);

    expect(db.update.callCount).toBe(2);
    expect(logger.error.calledOnce).toBe(true);
  });

  it("logs per-guild failures with guild, channel and error code context", async () => {
    const { deps, db, logger } = makeDeps();
    configureAllGuildsQuery(db, [guildRow()]);
    db.update.returns(mockDbChain([{ id: "uuid1" }]));
    const err = Object.assign(new Error("Bad Gateway"), { status: 502 });
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(textChannel(sinon.stub().rejects(err)));

    await sendMotivationCore(client as never, deps);

    const call = logger.error.getCalls().find((c) => c.args[1] === "Failed to send motivation to a guild");
    expect(call?.args[2]).toBe(err);
    expect(call?.args[3]).toEqual({ guildId: "g1", channelId: "ch1", code: undefined, status: 502 });
  });

  it("aborts the run on 401 without consuming claims or claiming later chunks", async () => {
    const { deps, db, logger } = makeDeps();
    configureAllGuildsQuery(db, manyGuilds(DELIVERY_CHUNK_SIZE + 5));
    db.update.returns(mockDbChain([{ id: "x" }]));
    const sendStub = sinon.stub().rejects(discordError(401, 0, "401: Unauthorized"));
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(textChannel(sendStub));

    await sendMotivationCore(client as never, deps);

    // First chunk: claim + release each; second chunk never claimed.
    expect(sendStub.callCount).toBe(DELIVERY_CHUNK_SIZE);
    expect(db.update.callCount).toBe(DELIVERY_CHUNK_SIZE * 2);
    expect(logger.error.getCalls().some((c) => String(c.args[1]).includes("401"))).toBe(true);
  });

  it("skips a row whose schedule evaluation throws without aborting the tick", async () => {
    const dueOccurrence = sinon.stub();
    dueOccurrence.onFirstCall().throws(new RangeError("invalid time zone: GMT+5"));
    dueOccurrence.onSecondCall().returns(new Date(Date.now() - 60_000));
    const { deps, db, logger } = makeDeps({ dueOccurrence });
    configureAllGuildsQuery(db, [
      guildRow({ id: "bad", guildId: "gBad", timezone: "GMT+5" }),
      guildRow({ id: "uuid2", guildId: "g2", motivationChannelId: "ch2" }),
    ]);
    db.update.returns(mockDbChain([{ id: "uuid2" }]));
    const sendStub = sinon.stub().resolves();
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(textChannel(sendStub));

    await sendMotivationCore(client as never, deps);

    expect(sendStub.calledOnce).toBe(true);
    expect(db.update.calledOnce).toBe(true);
    const warnCall = logger.warn.getCalls().find((c) => String(c.args[1]).includes("Invalid motivation schedule"));
    expect((warnCall?.args[2] as { guildId: string }).guildId).toBe("gBad");
  });

  it("claims each chunk only after the previous chunk's sends settle", async () => {
    const { deps, db } = makeDeps();
    configureAllGuildsQuery(db, manyGuilds(DELIVERY_CHUNK_SIZE + 3));
    const events: string[] = [];
    db.update.callsFake(() => {
      events.push("claim");
      return mockDbChain([{ id: "x" }]);
    });
    const sendStub = sinon.stub().callsFake(async () => {
      events.push("send");
    });
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(textChannel(sendStub));

    await sendMotivationCore(client as never, deps);

    expect(sendStub.callCount).toBe(DELIVERY_CHUNK_SIZE + 3);
    // Every claim after the first chunk's claims comes after all first-chunk sends.
    const firstSecondChunkClaim = events.indexOf("claim", DELIVERY_CHUNK_SIZE);
    const sendsBefore = events.slice(0, firstSecondChunkClaim).filter((e) => e === "send").length;
    expect(sendsBefore).toBe(DELIVERY_CHUNK_SIZE);
  });

  it("stops claiming once the signal is aborted, deferring the rest to the next tick", async () => {
    const controller = new AbortController();
    const { deps, db, logger } = makeDeps();
    configureAllGuildsQuery(db, manyGuilds(DELIVERY_CHUNK_SIZE + 4));
    db.update.returns(mockDbChain([{ id: "x" }]));
    const sendStub = sinon.stub().callsFake(async () => {
      // Shutdown arrives while the first chunk is in flight.
      controller.abort();
    });
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(textChannel(sendStub));

    await sendMotivationCore(client as never, deps, controller.signal);

    expect(sendStub.callCount).toBe(DELIVERY_CHUNK_SIZE);
    expect(db.update.callCount).toBe(DELIVERY_CHUNK_SIZE);
    expect(logger.warn.getCalls().some((c) => String(c.args[1]).includes("4 guild(s) deferred"))).toBe(true);
  });

  it("claims nothing when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const { deps, db } = makeDeps();
    configureAllGuildsQuery(db, [guildRow()]);

    await sendMotivationCore(mockClient() as never, deps, controller.signal);

    expect(db.update.called).toBe(false);
  });
});
