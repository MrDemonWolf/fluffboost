import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { InteractionContextType, MessageFlags } from "discord.js";
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
    mock.module("../../src/redis/index.js", () => ({ default: redis, bullRedis: {} }));

    const mod = await import("../../src/commands/suggestion.js");

    return { execute: mod.execute, slashCommand: mod.slashCommand, logger, db, env, redis };
  }

  function makeInteraction(quote: string, author: string) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("quote").returns(quote);
    getStringStub.withArgs("author").returns(author);
    return interaction;
  }

  function makeChannelClient() {
    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);
    return { client, channel };
  }

  const editContent = (interaction: ReturnType<typeof mockInteraction>) =>
    (interaction.editReply as sinon.SinonStub).firstCall.args[0].content as string;

  it("is registered for server contexts only", async () => {
    const { slashCommand } = await loadModule();
    expect(slashCommand.toJSON().contexts).toEqual([InteractionContextType.Guild]);
  });

  it("rejects whitespace-only input before acknowledging", async () => {
    const { execute, db } = await loadModule();
    const interaction = makeInteraction("   ", "Author");

    await execute(mockClient() as never, interaction as never);

    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg.content).toContain("Use a quote between 1 and");
    expect((interaction.deferReply as sinon.SinonStub).called).toBe(false);
    expect(db.select.called).toBe(false);
  });

  it("should reply when not in a guild", async () => {
    const { execute } = await loadModule();
    const interaction = makeInteraction("Be kind", "Anon");
    interaction.guildId = null as never;

    await execute(mockClient() as never, interaction as never);

    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg.content).toContain("only be used in a server");
    expect((interaction.deferReply as sinon.SinonStub).called).toBe(false);
  });

  it("defers ephemerally before any database or Redis round trip", async () => {
    const { execute, db, redis } = await loadModule();
    db.select.returns(mockDbChain([{ guildId: "guild-123" }]));
    db.insert.returns(mockDbChain([{ id: "s1", quote: "Be kind", author: "Anon", status: "Pending" }]));
    const interaction = makeInteraction("Be kind", "Anon");

    await execute(makeChannelClient().client as never, interaction as never);

    const defer = interaction.deferReply as sinon.SinonStub;
    expect(defer.calledOnceWithExactly({ flags: MessageFlags.Ephemeral })).toBe(true);
    expect(defer.calledBefore(db.select)).toBe(true);
    expect(defer.calledBefore(redis.eval)).toBe(true);
    // After deferring, every outcome is an edit with no flags.
    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
    expect((interaction.editReply as sinon.SinonStub).firstCall.args[0].flags).toBeUndefined();
  });

  it("tells members to ask an admin when the guild is not set up", async () => {
    const { execute, db, redis } = await loadModule();
    db.select.returns(mockDbChain([]));
    const interaction = makeInteraction("Be kind", "Anon");

    await execute(mockClient() as never, interaction as never);

    expect(editContent(interaction)).toContain("Ask a server admin to run `/setup channel`");
    expect(redis.eval.called).toBe(false);
  });

  it("should create suggestion and disclose public credit on success", async () => {
    const { execute, db, redis } = await loadModule();
    db.select.returns(mockDbChain([{ guildId: "guild-123" }]));
    db.insert.returns(mockDbChain([{ id: "s1", quote: "Be kind", author: "Anon", status: "Pending" }]));

    const interaction = makeInteraction("Be kind", "Anon");
    await execute(makeChannelClient().client as never, interaction as never);

    expect(db.insert.calledOnce).toBe(true);
    expect(redis.eval.calledOnce).toBe(true);
    const content = editContent(interaction);
    expect(content).toContain("will review your suggestion");
    expect(content).toContain("credited with your Discord username and avatar");
  });

  it("shows masked links and markdown literally in the staff review embed", async () => {
    const { execute, db } = await loadModule();
    const quote = "Rest is productive too. [Learn more](https://evil.example/verify)";
    db.select.returns(mockDbChain([{ guildId: "guild-123" }]));
    db.insert.returns(mockDbChain([{ id: "s1", quote, author: "__Anon__", status: "Pending" }]));
    const { client, channel } = makeChannelClient();

    await execute(client as never, makeInteraction(quote, "__Anon__") as never);

    const fields = channel.send.firstCall.args[0].embeds[0].data.fields as { name: string; value: string }[];
    expect(fields.find((f) => f.name === "Quote")?.value)
      .toBe("Rest is productive too. \\[Learn more](https://evil.example/verify)");
    expect(fields.find((f) => f.name === "Quote Author")?.value).toBe("\\_\\_Anon\\_\\_");
  });

  it("keeps an escaped maximum-length quote within the embed field limit", async () => {
    const { execute, db } = await loadModule();
    const quote = "*".repeat(1024);
    db.select.returns(mockDbChain([{ guildId: "guild-123" }]));
    db.insert.returns(mockDbChain([{ id: "s1", quote, author: "Anon", status: "Pending" }]));
    const { client, channel } = makeChannelClient();

    await execute(client as never, makeInteraction(quote, "Anon") as never);

    const fields = channel.send.firstCall.args[0].embeds[0].data.fields as { name: string; value: string }[];
    expect(fields.find((f) => f.name === "Quote")?.value.length).toBe(1024);
  });

  it("should reject submissions over the rolling daily quota before inserting", async () => {
    const { execute, db, redis } = await loadModule();
    db.select.returns(mockDbChain([{ guildId: "guild-123" }]));
    redis.eval.resolves(0);
    const interaction = makeInteraction("Be kind", "Anon");

    await execute(mockClient() as never, interaction as never);

    expect(redis.eval.calledOnce).toBe(true);
    expect(db.insert.called).toBe(false);
    expect(editContent(interaction)).toContain("up to 3 quote suggestions every 24 hours");
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
    expect(editContent(interaction)).toContain("An error occurred");
  });

  it("should not report success when the database insert returns no row", async () => {
    const { execute, db, redis } = await loadModule();
    db.select.returns(mockDbChain([{ guildId: "guild-123" }]));
    db.insert.returns(mockDbChain([]));
    const interaction = makeInteraction("Be kind", "Anon");

    await execute(mockClient() as never, interaction as never);

    expect(redis.eval.callCount).toBe(2);
    expect(redis.eval.secondCall.args[0]).toContain("ZREM");
    const content = editContent(interaction);
    expect(content).toContain("could not be saved");
    expect(content).not.toContain("will review");
  });

  it("should edit the deferred reply with an error on failure", async () => {
    const { execute, db, logger } = await loadModule();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.select.returns(chain);

    const interaction = makeInteraction("Be kind", "Anon");
    await execute(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
    expect((interaction.editReply as sinon.SinonStub).calledOnce).toBe(true);
    expect(editContent(interaction)).toContain("An error occurred");
  });
});
