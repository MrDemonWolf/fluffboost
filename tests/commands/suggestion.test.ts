import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockPosthog, mockClient, mockInteraction, mockEnv } from "../helpers.js";

describe("suggestion command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const prisma = mockPrisma();
    const posthog = mockPosthog();
    const env = mockEnv();

    const mod = await esmock("../../src/commands/suggestion.js", {
      "../../src/utils/logger.js": { default: logger },
      "../../src/database/index.js": { prisma },
      "../../src/utils/posthog.js": { default: posthog },
      "../../src/utils/env.js": { default: env },
    });

    return { execute: mod.execute, logger, prisma, posthog, env };
  }

  function makeInteraction(quote: string | null, author: string | null) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("quote").returns(quote);
    getStringStub.withArgs("author").returns(author);
    return interaction;
  }

  it("should reply when no quote provided", async () => {
    const { execute } = await loadModule();
    const interaction = makeInteraction(null, "Author");

    await execute(mockClient() as never, interaction as never);

    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg.content).to.equal("Please provide a quote");
  });

  it("should reply when no author provided", async () => {
    const { execute } = await loadModule();
    const interaction = makeInteraction("Be kind", null);

    await execute(mockClient() as never, interaction as never);

    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg.content).to.equal("Please provide an author");
  });

  it("should reply when not in a guild", async () => {
    const { execute } = await loadModule();
    const interaction = makeInteraction("Be kind", "Anon");
    interaction.guildId = null as never;

    await execute(mockClient() as never, interaction as never);

    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg.content).to.include("only be used in a server");
  });

  it("should reply when guild not setup", async () => {
    const { execute, prisma } = await loadModule();
    prisma.guild.findUnique.resolves(null);
    const interaction = makeInteraction("Be kind", "Anon");

    await execute(mockClient() as never, interaction as never);

    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg.content).to.include("not setup");
  });

  it("should create suggestion and reply on success", async () => {
    const { execute, prisma } = await loadModule();
    prisma.guild.findUnique.resolves({ guildId: "guild-123" });
    prisma.suggestionQuote.create.resolves({ id: "s1", quote: "Be kind", author: "Anon", status: "Pending" });

    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const interaction = makeInteraction("Be kind", "Anon");
    await execute(client as never, interaction as never);

    expect(prisma.suggestionQuote.create.calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("suggestion created");
  });

  it("should reply with error on failure", async () => {
    const { execute, prisma, logger } = await loadModule();
    prisma.guild.findUnique.rejects(new Error("DB error"));

    const interaction = makeInteraction("Be kind", "Anon");
    await execute(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).to.be.true;
    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
  });
});
