import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockClient, mockEnv } from "../../../helpers.js";

describe("admin quote remove command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../../../src/utils/env.js", () => ({ default: env }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().returns(true) }));

    const mod = await import("../../../../src/commands/admin/quote/remove.js");

    return { handler: mod.default, logger, db, env };
  }

  async function loadModuleNotPermitted() {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../../../src/utils/env.js", () => ({ default: env }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().resolves(false) }));

    const mod = await import("../../../../src/commands/admin/quote/remove.js");

    return { handler: mod.default, logger, db, env };
  }

  function makeInteraction(quoteId: string) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("quote_id", true).returns(quoteId);
    return interaction;
  }

  it("should return early when user is not permitted", async () => {
    const { handler } = await loadModuleNotPermitted();
    const interaction = makeInteraction("q1");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
  });

  it("should reply when quote not found", async () => {
    const { handler, db } = await loadModule();
    // select returns empty array -> destructures to undefined
    db.select.returns(mockDbChain([]));

    const interaction = makeInteraction("q-nonexistent");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArg.content).toContain("not found");
  });

  it("should delete quote and reply on success", async () => {
    const { handler, db } = await loadModule();
    // select returns the quote
    db.select.returns(mockDbChain([{ id: "q1", quote: "Be brave", author: "Anon" }]));

    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const interaction = makeInteraction("q1");
    await handler(client as never, interaction as never, interaction.options as never);

    expect(db.delete.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("deleted");
  });

  it("should send notification to main channel on delete", async () => {
    const { handler, db } = await loadModule();
    db.select.returns(mockDbChain([{ id: "q1", quote: "Be brave", author: "Anon" }]));

    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const interaction = makeInteraction("q1");
    await handler(client as never, interaction as never, interaction.options as never);

    expect(channel.send.calledOnce).toBe(true);
  });

  it("should reply with error on database failure", async () => {
    const { handler, db, logger } = await loadModule();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.select.returns(chain);

    const interaction = makeInteraction("q1");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("error occurred");
  });
});
