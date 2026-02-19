import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockInteraction, mockClient, mockEnv } from "../../../helpers.js";

describe("admin quote remove command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const prisma = mockPrisma();
    const env = mockEnv();

    const mod = await esmock("../../../../src/commands/admin/quote/remove.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/env.js": { default: env },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().returns(true) },
    });

    return { handler: mod.default, logger, prisma, env };
  }

  async function loadModuleNotPermitted() {
    const logger = mockLogger();
    const prisma = mockPrisma();
    const env = mockEnv();

    const mod = await esmock("../../../../src/commands/admin/quote/remove.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/env.js": { default: env },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().returns(false) },
    });

    return { handler: mod.default, logger, prisma, env };
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

    expect((interaction.reply as sinon.SinonStub).called).to.be.false;
  });

  it("should reply when quote not found", async () => {
    const { handler, prisma } = await loadModule();
    prisma.motivationQuote.findUnique.resolves(null);

    const interaction = makeInteraction("q-nonexistent");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArg).to.include("not found");
  });

  it("should delete quote and reply on success", async () => {
    const { handler, prisma } = await loadModule();
    prisma.motivationQuote.findUnique.resolves({ id: "q1", quote: "Be brave", author: "Anon" });

    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const interaction = makeInteraction("q1");
    await handler(client as never, interaction as never, interaction.options as never);

    expect(prisma.motivationQuote.delete.calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("deleted");
  });

  it("should send notification to main channel on delete", async () => {
    const { handler, prisma } = await loadModule();
    prisma.motivationQuote.findUnique.resolves({ id: "q1", quote: "Be brave", author: "Anon" });

    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const interaction = makeInteraction("q1");
    await handler(client as never, interaction as never, interaction.options as never);

    expect(channel.send.calledOnce).to.be.true;
  });

  it("should reply with error on database failure", async () => {
    const { handler, prisma, logger } = await loadModule();
    prisma.motivationQuote.findUnique.rejects(new Error("DB error"));

    const interaction = makeInteraction("q1");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(logger.commands.error.calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("error occurred");
  });
});
