import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockInteraction, mockClient, mockEnv } from "../../../helpers.js";

describe("admin suggestion approve command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: { env?: Record<string, unknown> } = {}) {
    const logger = mockLogger();
    const prisma = mockPrisma();
    const env = mockEnv(overrides.env);

    const mod = await esmock("../../../../src/commands/admin/suggestion/approve.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/env.js": { default: env },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().returns(true) },
    });

    return { handler: mod.default, logger, prisma, env };
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
    const { handler, prisma } = await loadModule();
    const interaction = makeInteraction("nonexistent");

    prisma.suggestionQuote.findUnique.resolves(null);

    await handler({} as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("not found");
  });

  it("should return error when already approved", async () => {
    const { handler, prisma } = await loadModule();
    const interaction = makeInteraction("s1");

    prisma.suggestionQuote.findUnique.resolves({
      id: "s1",
      quote: "Be kind",
      author: "Anon",
      addedBy: "user-1",
      status: "Approved",
    });

    await handler({} as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("already been approved");
  });

  it("should approve suggestion successfully", async () => {
    const { handler, prisma } = await loadModule();
    const interaction = makeInteraction("s1");
    const { client, channel, submitter } = makeClient();

    prisma.suggestionQuote.findUnique.resolves({
      id: "s1",
      quote: "Be kind",
      author: "Anon",
      addedBy: "user-1",
      status: "Pending",
    });

    await handler(client as never, interaction as never, interaction.options as never);

    // Creates motivation quote
    expect(prisma.motivationQuote.create.calledOnce).to.be.true;
    const createArgs = prisma.motivationQuote.create.firstCall.args[0];
    expect(createArgs.data.quote).to.equal("Be kind");
    expect(createArgs.data.author).to.equal("Anon");
    expect(createArgs.data.addedBy).to.equal("user-1");

    // Updates suggestion status
    expect(prisma.suggestionQuote.update.calledOnce).to.be.true;
    const updateArgs = prisma.suggestionQuote.update.firstCall.args[0];
    expect(updateArgs.data.status).to.equal("Approved");
    expect(updateArgs.data.reviewedBy).to.equal("user-123");

    // Sends embed to main channel
    expect(channel.send.calledOnce).to.be.true;

    // DMs submitter
    expect(submitter.send.calledOnce).to.be.true;

    // Ephemeral reply to admin
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("approved");
  });

  it("should not break if DM fails", async () => {
    const { handler, prisma } = await loadModule();
    const interaction = makeInteraction("s1");
    const { client } = makeClient();

    prisma.suggestionQuote.findUnique.resolves({
      id: "s1",
      quote: "Be kind",
      author: "Anon",
      addedBy: "user-1",
      status: "Pending",
    });

    // Make user fetch throw to simulate DMs disabled
    (client.users.fetch as sinon.SinonStub).rejects(new Error("Cannot send DM"));

    await handler(client as never, interaction as never, interaction.options as never);

    // Should still reply successfully
    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("approved");
  });
});
