import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockInteraction, mockClient, mockEnv } from "../../../helpers.js";

describe("admin suggestion reject command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: { env?: Record<string, unknown> } = {}) {
    const logger = mockLogger();
    const prisma = mockPrisma();
    const env = mockEnv(overrides.env);

    const mod = await esmock("../../../../src/commands/admin/suggestion/reject.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/env.js": { default: env },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().returns(true) },
    });

    return { handler: mod.default, logger, prisma, env };
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
    const { handler, prisma } = await loadModule();
    const interaction = makeInteraction("nonexistent");

    prisma.suggestionQuote.findUnique.resolves(null);

    await handler({} as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("not found");
  });

  it("should return error when already rejected", async () => {
    const { handler, prisma } = await loadModule();
    const interaction = makeInteraction("s1");

    prisma.suggestionQuote.findUnique.resolves({
      id: "s1",
      quote: "Be kind",
      author: "Anon",
      addedBy: "user-1",
      status: "Rejected",
    });

    await handler({} as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("already been rejected");
  });

  it("should reject suggestion with reason", async () => {
    const { handler, prisma } = await loadModule();
    const interaction = makeInteraction("s1", "Not appropriate");
    const { client, channel, submitter } = makeClient();

    prisma.suggestionQuote.findUnique.resolves({
      id: "s1",
      quote: "Bad quote",
      author: "Anon",
      addedBy: "user-1",
      status: "Pending",
    });

    await handler(client as never, interaction as never, interaction.options as never);

    // Updates suggestion status
    expect(prisma.suggestionQuote.update.calledOnce).to.be.true;
    const updateArgs = prisma.suggestionQuote.update.firstCall.args[0];
    expect(updateArgs.data.status).to.equal("Rejected");
    expect(updateArgs.data.reviewedBy).to.equal("user-123");

    // Sends embed to main channel with reason
    expect(channel.send.calledOnce).to.be.true;

    // DMs submitter with reason
    expect(submitter.send.calledOnce).to.be.true;
    const dmEmbed = submitter.send.firstCall.args[0].embeds[0];
    expect(dmEmbed.data.description).to.include("Not appropriate");

    // Ephemeral reply
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("rejected");
  });

  it("should reject suggestion without reason", async () => {
    const { handler, prisma } = await loadModule();
    const interaction = makeInteraction("s1");
    const { client, submitter } = makeClient();

    prisma.suggestionQuote.findUnique.resolves({
      id: "s1",
      quote: "Some quote",
      author: "Anon",
      addedBy: "user-1",
      status: "Pending",
    });

    await handler(client as never, interaction as never, interaction.options as never);

    expect(prisma.suggestionQuote.update.calledOnce).to.be.true;

    // DM should not include "Reason"
    const dmEmbed = submitter.send.firstCall.args[0].embeds[0];
    expect(dmEmbed.data.description).to.not.include("Reason");
  });

  it("should not break if DM fails", async () => {
    const { handler, prisma } = await loadModule();
    const interaction = makeInteraction("s1");
    const { client } = makeClient();

    prisma.suggestionQuote.findUnique.resolves({
      id: "s1",
      quote: "Some quote",
      author: "Anon",
      addedBy: "user-1",
      status: "Pending",
    });

    (client.users.fetch as sinon.SinonStub).rejects(new Error("Cannot send DM"));

    await handler(client as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("rejected");
  });
});
