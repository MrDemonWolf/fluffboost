import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockPosthog, mockClient, mockInteraction, mockEnv } from "../helpers.js";

describe("suggestion command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const db = mockDb();
    const posthog = mockPosthog();
    const env = mockEnv();

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/posthog.js", () => ({ default: posthog }));
    mock.module("../../src/utils/env.js", () => ({ default: env }));

    const mod = await import("../../src/commands/suggestion.js");

    return { execute: mod.execute, logger, db, posthog, env };
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
    const { execute, db } = await loadModule();
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
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("suggestion created");
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
