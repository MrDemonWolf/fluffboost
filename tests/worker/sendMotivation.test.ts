import { describe, it, expect, afterEach } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockClient } from "../helpers.js";
import { sendMotivationCore } from "../../src/worker/jobs/sendMotivationCore.js";
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
    const isGuildDueForMotivation =
      (overrides.isGuildDueForMotivation as sinon.SinonStub) ?? sinon.stub().returns(true);
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
      isGuildDueForMotivation,
      getRandomMotivationQuote,
      resolveQuoteAuthor,
      buildMotivationEmbed,
    };
    return { deps: deps as unknown as SendMotivationDeps, db, logger, isGuildDueForMotivation };
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
    const { deps, db } = makeDeps({ isGuildDueForMotivation: sinon.stub().returns(false) });
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
    configureAllGuildsQuery(db, [guildRow()]);
    db.update.returns(mockDbChain([{ id: "uuid1" }]));

    const sendStub = sinon.stub().rejects(new Error("Discord 5xx"));
    const channel = { isTextBased: () => true, isDMBased: () => false, send: sendStub };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    await sendMotivationCore(client as never, deps);

    // First update = claim, second update = release.
    expect(db.update.callCount).toBe(2);
    expect(logger.error.called).toBe(true);
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
});
