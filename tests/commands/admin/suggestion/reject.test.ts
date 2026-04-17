import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockClient, mockEnv } from "../../../helpers.js";

describe("admin suggestion reject command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(
    fetchResult: { status?: string; id?: string; quote?: string; author?: string; addedBy?: string } | null
  ) {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../../../src/utils/env.js", () => ({ default: env }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().returns(true) }));

    // fetchPendingSuggestion mocked to return the pre-validated suggestion or null.
    mock.module("../../../../src/utils/suggestionHelpers.js", () => ({
      fetchPendingSuggestion: sinon.stub().callsFake(async (_id: string, interaction: { reply: sinon.SinonStub }) => {
        if (fetchResult === null) {
          await interaction.reply({ content: "not found", flags: 64 });
          return null;
        }
        return fetchResult;
      }),
    }));

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

  it("should return early when helper reports missing/non-pending", async () => {
    const { handler, db } = await loadModule(null);
    const interaction = makeInteraction("nonexistent");

    await handler({} as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    expect(db.update.called).toBe(false);
  });

  it("should reject suggestion with reason", async () => {
    const { handler, db } = await loadModule({
      id: "s1",
      quote: "Bad quote",
      author: "Anon",
      addedBy: "user-1",
      status: "Pending",
    });
    const { client, channel, submitter } = makeClient();
    db.update.returns(mockDbChain([]));

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
    const { handler, db } = await loadModule({
      id: "s1",
      quote: "Some quote",
      author: "Anon",
      addedBy: "user-1",
      status: "Pending",
    });
    const { client, submitter } = makeClient();
    db.update.returns(mockDbChain([]));

    const interaction = makeInteraction("s1");
    await handler(client as never, interaction as never, interaction.options as never);

    expect(db.update.calledOnce).toBe(true);
    const dmEmbed = submitter.send.firstCall.args[0].embeds[0];
    expect(dmEmbed.data.description).not.toContain("Reason");
  });

  it("should not break if submitter DM fails", async () => {
    const { handler, db } = await loadModule({
      id: "s1",
      quote: "Some quote",
      author: "Anon",
      addedBy: "user-1",
      status: "Pending",
    });
    const { client } = makeClient();
    db.update.returns(mockDbChain([]));
    (client.users.fetch as sinon.SinonStub).rejects(new Error("Cannot send DM"));

    const interaction = makeInteraction("s1");
    await handler(client as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("rejected");
  });
});
