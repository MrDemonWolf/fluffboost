import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockPermissions } from "../../permissionsMock.js";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockClient, mockEnv } from "../../../helpers.js";

const QUOTE_ID = "6a1c3e5f-7b9d-4f1a-8c2e-4d6f8a0b2c4e";

describe("admin quote remove command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(permitted = true) {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../../../src/utils/env.js", () => ({ default: env }));
    await mockPermissions(permitted);

    const mod = await import("../../../../src/commands/admin/quote/remove.js");

    return { handler: mod.default, logger, db, env };
  }

  function makeInteraction(quoteId: string) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("quote_id", true).returns(quoteId);
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

  it("should return early without touching the database when user is not permitted", async () => {
    const { handler, db } = await loadModule(false);
    const interaction = makeInteraction(QUOTE_ID);

    await handler(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
    expect(db.select.called).toBe(false);
    expect(db.delete.called).toBe(false);
  });

  it("should reply when quote not found", async () => {
    const { handler, db } = await loadModule();
    db.delete.returns(mockDbChain([]));

    const interaction = makeInteraction(QUOTE_ID);
    await handler(mockClient() as never, interaction as never);

    const replyArg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArg.content).toContain("not found");
  });

  it("replies not found for a malformed ID without querying the database", async () => {
    const { handler, db, logger } = await loadModule();

    const interaction = makeInteraction(`${QUOTE_ID}x`);
    await handler(mockClient() as never, interaction as never);

    expect(db.delete.called).toBe(false);
    expect(logger.commands.error.called).toBe(false);
    const replyArg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArg.content).toContain("not found");
  });

  it("should delete quote atomically and reply on success", async () => {
    const { handler, db } = await loadModule();
    const chain = mockDbChain([{ id: QUOTE_ID }]);
    db.delete.returns(chain);

    const interaction = makeInteraction(QUOTE_ID);
    await handler(makeChannelClient().client as never, interaction as never);

    // One DELETE ... RETURNING, no separate existence SELECT to race with.
    expect(db.select.called).toBe(false);
    expect(db.delete.calledOnce).toBe(true);
    expect((chain["returning"] as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("deleted");
  });

  it("should send notification to main channel on delete", async () => {
    const { handler, db } = await loadModule();
    db.delete.returns(mockDbChain([{ id: QUOTE_ID }]));
    const { client, channel } = makeChannelClient();

    const interaction = makeInteraction(QUOTE_ID);
    await handler(client as never, interaction as never);

    expect(channel.send.calledOnce).toBe(true);
  });

  it("does not announce when a concurrent remove already deleted the quote", async () => {
    const { handler, db } = await loadModule();
    db.delete.returns(mockDbChain([]));
    const { client, channel } = makeChannelClient();

    const interaction = makeInteraction(QUOTE_ID);
    await handler(client as never, interaction as never);

    expect(channel.send.called).toBe(false);
    expect((interaction.reply as sinon.SinonStub).firstCall.args[0].content).toContain("not found");
  });

  it("should reply with error on database failure", async () => {
    const { handler, db, logger } = await loadModule();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.delete.returns(chain);

    const interaction = makeInteraction(QUOTE_ID);
    await handler(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("error occurred");
  });
});
