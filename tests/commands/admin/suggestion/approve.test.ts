import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockClient, mockEnv } from "../../../helpers.js";

describe("admin suggestion approve command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: { env?: Record<string, unknown> } = {}) {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv(overrides.env);

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../../../src/utils/env.js", () => ({ default: env }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().resolves(true) }));

    const mod = await import("../../../../src/commands/admin/suggestion/approve.js");

    return { handler: mod.default, logger, db, env };
  }

  function makeInteraction(suggestionId: string) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("suggestion_id", true).returns(suggestionId);
    return interaction;
  }

  function makeClient() {
    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const submitter = {
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);
    (client.users.fetch as sinon.SinonStub).resolves(submitter);
    return { client, channel, submitter };
  }

  it("should return error when suggestion not found", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction("nonexistent");

    // select().from().where().limit(1) returns empty -> destructures to undefined
    db.select.returns(mockDbChain([]));

    await handler({} as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("not found");
  });

  it("should return error when already approved", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction("s1");

    db.select.returns(mockDbChain([{
      id: "s1",
      quote: "Be kind",
      author: "Anon",
      addedBy: "user-1",
      status: "Approved",
    }]));

    await handler({} as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("already been approved");
  });

  it("should approve suggestion successfully", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction("s1");
    const { client, channel, submitter } = makeClient();

    db.select.returns(mockDbChain([{
      id: "s1",
      quote: "Be kind",
      author: "Anon",
      addedBy: "user-1",
      status: "Pending",
    }]));

    // Capture what happens inside the transaction
    let txDb: ReturnType<typeof mockDb>;
    db.transaction.callsFake(async (fn: (tx: ReturnType<typeof mockDb>) => Promise<unknown>) => {
      txDb = mockDb();
      return fn(txDb);
    });

    await handler(client as never, interaction as never, interaction.options as never);

    // Transaction was called
    expect(db.transaction.calledOnce).toBe(true);

    // Inside transaction: insert (motivation quote) and update (suggestion status)
    expect(txDb!.insert.calledOnce).toBe(true);
    expect(txDb!.update.calledOnce).toBe(true);

    // Sends embed to main channel
    expect(channel.send.calledOnce).toBe(true);

    // DMs submitter
    expect(submitter.send.calledOnce).toBe(true);

    // Ephemeral reply to admin
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("approved");
  });

  it("should not break if DM fails", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction("s1");
    const { client } = makeClient();

    db.select.returns(mockDbChain([{
      id: "s1",
      quote: "Be kind",
      author: "Anon",
      addedBy: "user-1",
      status: "Pending",
    }]));

    // Make user fetch throw to simulate DMs disabled
    (client.users.fetch as sinon.SinonStub).rejects(new Error("Cannot send DM"));

    await handler(client as never, interaction as never, interaction.options as never);

    // Should still reply successfully
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("approved");
  });
});
