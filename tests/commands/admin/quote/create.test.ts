import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockInteraction, mockClient, mockEnv } from "../../../helpers.js";

describe("admin quote create command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const prisma = mockPrisma();
    const env = mockEnv();

    const mod = await esmock("../../../../src/commands/admin/quote/create.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/env.js": { default: env },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().resolves(true) },
    });

    return { handler: mod.default, logger, prisma, env };
  }

  async function loadModuleNotPermitted() {
    const logger = mockLogger();
    const prisma = mockPrisma();
    const env = mockEnv();

    const mod = await esmock("../../../../src/commands/admin/quote/create.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/env.js": { default: env },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().resolves(false) },
    });

    return { handler: mod.default, logger, prisma, env };
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

    expect((interaction.reply as sinon.SinonStub).called).to.be.false;
  });

  it("should reply when no quote provided", async () => {
    const { handler } = await loadModule();
    const interaction = makeInteraction(null, "Author");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("provide a quote");
  });

  it("should reply when no author provided", async () => {
    const { handler } = await loadModule();
    const interaction = makeInteraction("Be kind", null);

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("provide an author");
  });

  it("should create quote and reply on success", async () => {
    const { handler, prisma } = await loadModule();
    prisma.motivationQuote.create.resolves({ id: "q1", quote: "Be kind", author: "Anon", addedBy: "user-123" });

    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const interaction = makeInteraction("Be kind", "Anon");
    await handler(client as never, interaction as never, interaction.options as never);

    expect(prisma.motivationQuote.create.calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("Quote created");
  });

  it("should send embed to main channel on success", async () => {
    const { handler, prisma } = await loadModule();
    prisma.motivationQuote.create.resolves({ id: "q1", quote: "Be kind", author: "Anon", addedBy: "user-123" });

    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const interaction = makeInteraction("Be kind", "Anon");
    await handler(client as never, interaction as never, interaction.options as never);

    expect(channel.send.calledOnce).to.be.true;
    const sendArgs = channel.send.firstCall.args[0];
    expect(sendArgs.embeds).to.be.an("array").with.lengthOf(1);
  });

  it("should reply with error on database failure", async () => {
    const { handler, prisma, logger } = await loadModule();
    prisma.motivationQuote.create.rejects(new Error("DB error"));

    const interaction = makeInteraction("Be kind", "Anon");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(logger.commands.error.calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("error occurred");
  });
});
