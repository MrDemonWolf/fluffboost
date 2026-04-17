import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockClient } from "../helpers.js";

describe("sendMotivation", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: {
    db?: ReturnType<typeof mockDb>;
    logger?: ReturnType<typeof mockLogger>;
    isGuildDueForMotivation?: sinon.SinonStub;
    getRandomMotivationQuote?: sinon.SinonStub;
    resolveQuoteAuthor?: sinon.SinonStub;
  } = {}) {
    const db = overrides.db ?? mockDb();
    const logger = overrides.logger ?? mockLogger();
    const isGuildDueStub = overrides.isGuildDueForMotivation ?? sinon.stub().returns(true);
    const randomQuoteStub =
      overrides.getRandomMotivationQuote ??
      sinon.stub().resolves({ id: "q1", quote: "Stay strong", author: "Author", addedBy: "u1", createdAt: new Date() });
    const authorStub =
      overrides.resolveQuoteAuthor ??
      sinon.stub().resolves({ username: "authoruser", displayAvatarURL: () => "https://x/avatar.png" });

    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/scheduleEvaluator.js", () => ({ isGuildDueForMotivation: isGuildDueStub }));
    mock.module("../../src/utils/quoteHelpers.js", () => ({
      getRandomMotivationQuote: randomQuoteStub,
      buildMotivationEmbed: () => ({}),
      resolveQuoteAuthor: authorStub,
    }));

    const mod = await import("../../src/worker/jobs/sendMotivation.js");
    return { sendMotivation: mod.default, db, logger, isGuildDueStub, randomQuoteStub };
  }

  function configureAllGuildsQuery(db: ReturnType<typeof mockDb>, rows: unknown[]) {
    db.select.onCall(0).returns(mockDbChain(rows));
  }

  it("should return early when no guilds have channels configured", async () => {
    const db = mockDb();
    configureAllGuildsQuery(db, []);
    const { sendMotivation } = await loadModule({ db });

    await sendMotivation(mockClient() as never);
    expect(db.select.callCount).toBe(1);
  });

  it("should return early when no guilds are due", async () => {
    const db = mockDb();
    configureAllGuildsQuery(db, [{ id: "uuid1", guildId: "g1", motivationChannelId: "ch1", timezone: "UTC", motivationFrequency: "Daily", lastMotivationSentAt: null }]);
    const isGuildDueStub = sinon.stub().returns(false);

    const { sendMotivation } = await loadModule({ db, isGuildDueForMotivation: isGuildDueStub });
    await sendMotivation(mockClient() as never);
    expect(db.update.called).toBe(false);
  });

  it("should warn and return when motivation table is empty", async () => {
    const db = mockDb();
    configureAllGuildsQuery(db, [{ id: "uuid1", guildId: "g1", motivationChannelId: "ch1", timezone: "UTC", motivationFrequency: "Daily", lastMotivationSentAt: null }]);

    const { sendMotivation, logger } = await loadModule({
      db,
      getRandomMotivationQuote: sinon.stub().resolves(null),
    });
    await sendMotivation(mockClient() as never);

    expect(logger.warn.called).toBe(true);
    expect(db.update.called).toBe(false);
  });

  it("should atomically claim guild before sending and send embed on success", async () => {
    const db = mockDb();
    configureAllGuildsQuery(db, [{ id: "uuid1", guildId: "g1", motivationChannelId: "ch1", timezone: "UTC", motivationFrequency: "Daily", lastMotivationSentAt: null }]);

    // claimGuild update returns a row — we won the claim.
    db.update.returns(mockDbChain([{ id: "uuid1" }]));

    const sendStub = sinon.stub().resolves();
    const channel = { isTextBased: () => true, isDMBased: () => false, send: sendStub };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const { sendMotivation } = await loadModule({ db });
    await sendMotivation(client as never);

    expect(db.update.calledOnce).toBe(true);
    expect(sendStub.calledOnce).toBe(true);
  });

  it("should skip send when another worker already claimed the guild (race)", async () => {
    const db = mockDb();
    configureAllGuildsQuery(db, [{ id: "uuid1", guildId: "g1", motivationChannelId: "ch1", timezone: "UTC", motivationFrequency: "Daily", lastMotivationSentAt: null }]);

    // Empty returning() — another worker won the race first.
    db.update.returns(mockDbChain([]));

    const sendStub = sinon.stub().resolves();
    const channel = { isTextBased: () => true, isDMBased: () => false, send: sendStub };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const { sendMotivation } = await loadModule({ db });
    await sendMotivation(client as never);

    expect(sendStub.called).toBe(false);
  });

  it("should skip guilds with invalid channels after winning claim", async () => {
    const db = mockDb();
    configureAllGuildsQuery(db, [{ id: "uuid1", guildId: "g1", motivationChannelId: "ch1", timezone: "UTC", motivationFrequency: "Daily", lastMotivationSentAt: null }]);
    db.update.returns(mockDbChain([{ id: "uuid1" }]));

    const channel = { isTextBased: () => false, isDMBased: () => false, send: sinon.stub() };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const { sendMotivation, logger } = await loadModule({ db });
    await sendMotivation(client as never);

    expect(channel.send.called).toBe(false);
    expect(logger.warn.called).toBe(true);
  });

  it("should isolate per-guild send failures via Promise.allSettled", async () => {
    const db = mockDb();
    configureAllGuildsQuery(db, [
      { id: "uuid1", guildId: "g1", motivationChannelId: "ch1", timezone: "UTC", motivationFrequency: "Daily", lastMotivationSentAt: null },
      { id: "uuid2", guildId: "g2", motivationChannelId: "ch2", timezone: "UTC", motivationFrequency: "Daily", lastMotivationSentAt: null },
    ]);
    db.update.returns(mockDbChain([{ id: "uuid1" }]));

    const sendStub = sinon.stub();
    sendStub.onFirstCall().rejects(new Error("channel error"));
    sendStub.onSecondCall().resolves();
    const channel = { isTextBased: () => true, isDMBased: () => false, send: sendStub };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const { sendMotivation, logger } = await loadModule({ db });
    await sendMotivation(client as never);

    expect(logger.error.called).toBe(true);
  });

  it("should tolerate user fetch failure for addedBy", async () => {
    const db = mockDb();
    configureAllGuildsQuery(db, [{ id: "uuid1", guildId: "g1", motivationChannelId: "ch1", timezone: "UTC", motivationFrequency: "Daily", lastMotivationSentAt: null }]);
    db.update.returns(mockDbChain([{ id: "uuid1" }]));

    const sendStub = sinon.stub().resolves();
    const channel = { isTextBased: () => true, isDMBased: () => false, send: sendStub };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const { sendMotivation } = await loadModule({
      db,
      resolveQuoteAuthor: sinon.stub().resolves(null),
    });
    await sendMotivation(client as never);

    expect(sendStub.calledOnce).toBe(true);
  });
});
