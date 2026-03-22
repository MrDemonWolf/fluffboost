import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockClient, mockEnv } from "../../../helpers.js";

describe("admin quote create command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db }));
    mock.module("../../../../src/utils/env.js", () => ({ default: env }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().resolves(true) }));

    const mod = await import("../../../../src/commands/admin/quote/create.js");

    return { handler: mod.default, logger, db, env };
  }

  async function loadModuleNotPermitted() {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db }));
    mock.module("../../../../src/utils/env.js", () => ({ default: env }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().resolves(false) }));

    const mod = await import("../../../../src/commands/admin/quote/create.js");

    return { handler: mod.default, logger, db, env };
  }

  function makeInteraction(quote: string | null, author: string | null) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("quote").returns(quote);
    getStringStub.withArgs("quote_author").returns(author);
    return interaction;
  }

  it("should return early when user is not permitted", async () => {
    const { handler } = await loadModuleNotPermitted();
    const interaction = makeInteraction("Be kind", "Anon");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
  });

  it("should reply when no quote provided", async () => {
    const { handler } = await loadModule();
    const interaction = makeInteraction(null, "Author");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("provide a quote");
  });

  it("should reply when no author provided", async () => {
    const { handler } = await loadModule();
    const interaction = makeInteraction("Be kind", null);

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("provide an author");
  });

  it("should create quote and reply on success", async () => {
    const { handler, db } = await loadModule();
    db.insert.returns(mockDbChain([{ id: "q1", quote: "Be kind", author: "Anon", addedBy: "user-123" }]));

    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const interaction = makeInteraction("Be kind", "Anon");
    await handler(client as never, interaction as never, interaction.options as never);

    expect(db.insert.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Quote created");
  });

  it("should send embed to main channel on success", async () => {
    const { handler, db } = await loadModule();
    db.insert.returns(mockDbChain([{ id: "q1", quote: "Be kind", author: "Anon", addedBy: "user-123" }]));

    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const interaction = makeInteraction("Be kind", "Anon");
    await handler(client as never, interaction as never, interaction.options as never);

    expect(channel.send.calledOnce).toBe(true);
    const sendArgs = channel.send.firstCall.args[0];
    expect(Array.isArray(sendArgs.embeds)).toBe(true);
    expect(sendArgs.embeds).toHaveLength(1);
  });

  it("should reply with error on database failure", async () => {
    const { handler, db, logger } = await loadModule();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.insert.returns(chain);

    const interaction = makeInteraction("Be kind", "Anon");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("error occurred");
  });
});
