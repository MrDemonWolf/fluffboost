import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockClient, mockInteraction, mockEnv } from "../helpers.js";

describe("suggestion command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();
    const redis = { eval: sinon.stub().resolves(1) };

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/env.js", () => ({ default: env }));
    mock.module("../../src/redis/index.js", () => ({ default: redis, bullConnection: {} }));

    const mod = await import("../../src/commands/suggestion.js");

    return { execute: mod.execute, logger, db, env, redis };
  }

  function makeInteraction(quote: string | null, author: string | null) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("quote").returns(quote);
    getStringStub.withArgs("author").returns(author);
    return interaction;
  }

  it("should reply when no quote provided", async () => {
    const { execute } = await loadModule();
    const interaction = makeInteraction(null, "Author");

    await execute(mockClient() as never, interaction as never);

    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg.content).toBe("Please provide a quote");
  });

  it("should reply when no author provided", async () => {
    const { execute } = await loadModule();
    const interaction = makeInteraction("Be kind", null);

    await execute(mockClient() as never, interaction as never);

    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg.content).toBe("Please provide an author");
  });

  it("should reply when not in a guild", async () => {
    const { execute } = await loadModule();
    const interaction = makeInteraction("Be kind", "Anon");
    interaction.guildId = null as never;

    await execute(mockClient() as never, interaction as never);

    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg.content).toContain("only be used in a server");
  });

  it("should reply when guild not setup", async () => {
    const { execute, db } = await loadModule();
    // guild lookup returns empty array (no guild found) -> destructures to undefined
    db.select.returns(mockDbChain([]));
    const interaction = makeInteraction("Be kind", "Anon");

    await execute(mockClient() as never, interaction as never);

    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg.content).toContain("not setup");
  });

  it("should create suggestion and reply on success", async () => {
    const { execute, db, redis } = await loadModule();
    // guild lookup returns a guild
    db.select.returns(mockDbChain([{ guildId: "guild-123" }]));
    // insert returns the created suggestion
    db.insert.returns(mockDbChain([{ id: "s1", quote: "Be kind", author: "Anon", status: "Pending" }]));

    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const interaction = makeInteraction("Be kind", "Anon");
    await execute(client as never, interaction as never);

    expect(db.insert.calledOnce).toBe(true);
    expect(redis.eval.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("suggestion created");
  });

  it("should reject submissions over the rolling daily quota before inserting", async () => {
    const { execute, db, redis } = await loadModule();
    db.select.returns(mockDbChain([{ guildId: "guild-123" }]));
    redis.eval.resolves(0);
    const interaction = makeInteraction("Be kind", "Anon");

    await execute(mockClient() as never, interaction as never);

    expect(redis.eval.calledOnce).toBe(true);
    expect(db.insert.called).toBe(false);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("up to 3 quote suggestions every 24 hours");
  });

  it("should release the quota reservation when the database insert fails", async () => {
    const { execute, db, logger, redis } = await loadModule();
    db.select.returns(mockDbChain([{ guildId: "guild-123" }]));
    const insertChain = mockDbChain();
    insertChain.rejects(new Error("DB error"));
    db.insert.returns(insertChain);
    redis.eval.onSecondCall().resolves(1);
    const interaction = makeInteraction("Be kind", "Anon");

    await execute(mockClient() as never, interaction as never);

    expect(db.insert.calledOnce).toBe(true);
    expect(redis.eval.callCount).toBe(2);
    expect(redis.eval.secondCall.args[0]).toContain("ZREM");
    expect(logger.commands.error.calledOnce).toBe(true);
    expect((interaction.reply as sinon.SinonStub).firstCall.args[0].content)
      .toContain("An error occurred");
  });

  it("should not report success when the database insert returns no row", async () => {
    const { execute, db, redis } = await loadModule();
    db.select.returns(mockDbChain([{ guildId: "guild-123" }]));
    db.insert.returns(mockDbChain([]));
    const interaction = makeInteraction("Be kind", "Anon");

    await execute(mockClient() as never, interaction as never);

    expect(redis.eval.callCount).toBe(2);
    expect(redis.eval.secondCall.args[0]).toContain("ZREM");
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("could not be saved");
    expect(replyArgs.content).not.toContain("suggestion created");
  });

  it("should reply with error on failure", async () => {
    const { execute, db, logger } = await loadModule();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.select.returns(chain);

    const interaction = makeInteraction("Be kind", "Anon");
    await execute(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
  });
});
