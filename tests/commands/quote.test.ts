import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockPosthog, mockClient, mockInteraction } from "../helpers.js";

describe("quote command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const prisma = mockPrisma();
    const posthog = mockPosthog();

    const mod = await esmock("../../src/commands/quote.js", {
      "../../src/utils/logger.js": { default: logger },
      "../../src/database/index.js": { prisma },
      "../../src/utils/posthog.js": { default: posthog },
    });

    return { execute: mod.execute, logger, prisma, posthog };
  }

  it("should reply when no quotes found", async () => {
    const { execute, prisma } = await loadModule();
    prisma.motivationQuote.count.resolves(0);
    prisma.motivationQuote.findMany.resolves([]);

    const interaction = mockInteraction();
    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg).to.include("No motivation quote found");
  });

  it("should reply with quote embed", async () => {
    const { execute, prisma } = await loadModule();
    prisma.motivationQuote.count.resolves(1);
    prisma.motivationQuote.findMany.resolves([
      { id: "q1", quote: "Be brave", author: "Anon", addedBy: "user-1", createdAt: new Date() },
    ]);

    const client = mockClient();
    const interaction = mockInteraction();
    await execute(client as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.embeds).to.be.an("array").with.lengthOf(1);
  });

  it("should capture posthog event on success", async () => {
    const { execute, prisma, posthog } = await loadModule();
    prisma.motivationQuote.count.resolves(1);
    prisma.motivationQuote.findMany.resolves([
      { id: "q1", quote: "Be brave", author: "Anon", addedBy: "user-1", createdAt: new Date() },
    ]);

    const client = mockClient();
    const interaction = mockInteraction();
    await execute(client as never, interaction as never);

    expect(posthog.capture.calledOnce).to.be.true;
    expect(posthog.capture.firstCall.args[0].event).to.equal("quote command used");
  });

  it("should reply with error on failure", async () => {
    const { execute, prisma, logger } = await loadModule();
    prisma.motivationQuote.count.rejects(new Error("DB error"));

    const interaction = mockInteraction();
    await execute(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).to.be.true;
    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
  });
});
