import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockClient, mockEnv } from "../../../helpers.js";

describe("admin suggestion reject command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: { env?: Record<string, unknown> } = {}) {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv(overrides.env);

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db }));
    mock.module("../../../../src/utils/env.js", () => ({ default: env, envSchema: {} }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().returns(true) }));

    const mod = await import("../../../../src/commands/admin/suggestion/reject.js");

    return { handler: mod.default, logger, db, env };
  }

  function makeInteraction(suggestionId: string, reason: string | null = null) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("suggestion_id", true).returns(suggestionId);
    getStringStub.withArgs("reason").returns(reason);
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

    // update().set().where().returning() returns empty array (no rows matched)
    db.update.returns(mockDbChain([]));
    // select().from().where().limit(1) returns empty (not found)
    db.select.returns(mockDbChain([]));

    await handler({} as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("not found");
  });

  it("should return error when already rejected", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction("s1");

    // update returns empty (no pending row matched)
    db.update.returns(mockDbChain([]));
    // select finds the existing row with Rejected status
    db.select.returns(mockDbChain([{
      id: "s1",
      quote: "Be kind",
      author: "Anon",
      addedBy: "user-1",
      status: "Rejected",
    }]));

    await handler({} as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("already been rejected");
  });

  it("should reject suggestion with reason", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction("s1", "Not appropriate");
    const { client, channel, submitter } = makeClient();

    // update().set().where().returning() returns non-empty (row was updated)
    db.update.returns(mockDbChain([{
      id: "s1",
      quote: "Bad quote",
      author: "Anon",
      addedBy: "user-1",
      status: "Rejected",
      reviewedBy: "user-123",
    }]));
    // After successful update, select fetches the full suggestion for embed
    db.select.returns(mockDbChain([{
      id: "s1",
      quote: "Bad quote",
      author: "Anon",
      addedBy: "user-1",
      status: "Rejected",
    }]));

    await handler(client as never, interaction as never, interaction.options as never);

    // Updates suggestion status via update
    expect(db.update.calledOnce).toBe(true);

    // Sends embed to main channel with reason
    expect(channel.send.calledOnce).toBe(true);

    // DMs submitter with reason
    expect(submitter.send.calledOnce).toBe(true);
    const dmEmbed = submitter.send.firstCall.args[0].embeds[0];
    expect(dmEmbed.data.description).toContain("Not appropriate");

    // Ephemeral reply
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("rejected");
  });

  it("should reject suggestion without reason", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction("s1");
    const { client, submitter } = makeClient();

    db.update.returns(mockDbChain([{
      id: "s1",
      quote: "Some quote",
      author: "Anon",
      addedBy: "user-1",
      status: "Rejected",
    }]));
    db.select.returns(mockDbChain([{
      id: "s1",
      quote: "Some quote",
      author: "Anon",
      addedBy: "user-1",
      status: "Rejected",
    }]));

    await handler(client as never, interaction as never, interaction.options as never);

    expect(db.update.calledOnce).toBe(true);

    // DM should not include "Reason"
    const dmEmbed = submitter.send.firstCall.args[0].embeds[0];
    expect(dmEmbed.data.description).not.toContain("Reason");

    // Reply should be ephemeral
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("rejected");
  });

  it("should not break if DM fails", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction("s1");
    const { client } = makeClient();

    db.update.returns(mockDbChain([{
      id: "s1",
      quote: "Some quote",
      author: "Anon",
      addedBy: "user-1",
      status: "Rejected",
    }]));
    db.select.returns(mockDbChain([{
      id: "s1",
      quote: "Some quote",
      author: "Anon",
      addedBy: "user-1",
      status: "Rejected",
    }]));

    (client.users.fetch as sinon.SinonStub).rejects(new Error("Cannot send DM"));

    await handler(client as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("rejected");
  });
});
