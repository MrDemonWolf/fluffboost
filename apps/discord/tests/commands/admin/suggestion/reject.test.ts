import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockClient, mockEnv } from "../../../helpers.js";

describe("admin suggestion reject command", () => {
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

    const mod = await import("../../../../src/commands/admin/suggestion/reject.js");
    return { handler: mod.default, logger, db };
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
    const submitter = { send: sinon.stub().resolves() };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);
    (client.users.fetch as sinon.SinonStub).resolves(submitter);
    return { client, channel, submitter };
  }

  const PENDING_ROW = {
    id: "s1",
    quote: "Bad quote",
    author: "Anon",
    addedBy: "user-1",
    status: "Pending",
  };

  it("should return early when suggestion not found", async () => {
    const { handler, db } = await loadModule();
    db.select.returns(mockDbChain([]));

    const interaction = makeInteraction("nonexistent");
    await handler({} as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    expect(db.update.called).toBe(false);
  });

  it("should reject suggestion with reason", async () => {
    const { handler, db } = await loadModule();
    db.select.returns(mockDbChain([PENDING_ROW]));
    db.update.returns(mockDbChain([{ id: "s1" }]));

    const { client, channel, submitter } = makeClient();
    const interaction = makeInteraction("s1", "Not appropriate");
    await handler(client as never, interaction as never, interaction.options as never);

    expect(db.update.calledOnce).toBe(true);
    expect(channel.send.calledOnce).toBe(true);
    expect(submitter.send.calledOnce).toBe(true);
    const dmEmbed = submitter.send.firstCall.args[0].embeds[0];
    expect(dmEmbed.data.description).toContain("Not appropriate");
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("rejected");
  });

  it("should reject suggestion without reason (no reason in DM)", async () => {
    const { handler, db } = await loadModule();
    db.select.returns(mockDbChain([PENDING_ROW]));
    db.update.returns(mockDbChain([{ id: "s1" }]));

    const { client, submitter } = makeClient();
    const interaction = makeInteraction("s1");
    await handler(client as never, interaction as never, interaction.options as never);

    expect(db.update.calledOnce).toBe(true);
    const dmEmbed = submitter.send.firstCall.args[0].embeds[0];
    expect(dmEmbed.data.description).not.toContain("Reason");
  });

  it("should short-circuit when atomic UPDATE affects zero rows (concurrent review)", async () => {
    const { handler, db } = await loadModule();
    db.select.returns(mockDbChain([PENDING_ROW]));
    db.update.returns(mockDbChain([])); // zero rows — another admin beat us

    const { client, channel, submitter } = makeClient();
    const interaction = makeInteraction("s1");
    await handler(client as never, interaction as never, interaction.options as never);

    expect(db.update.calledOnce).toBe(true);
    expect(channel.send.called).toBe(false);
    expect(submitter.send.called).toBe(false);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("just reviewed");
  });

  it("should not break if submitter DM fails", async () => {
    const { handler, db } = await loadModule();
    db.select.returns(mockDbChain([PENDING_ROW]));
    db.update.returns(mockDbChain([{ id: "s1" }]));

    const { client } = makeClient();
    (client.users.fetch as sinon.SinonStub).rejects(new Error("Cannot send DM"));

    const interaction = makeInteraction("s1");
    await handler(client as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("rejected");
  });
});
