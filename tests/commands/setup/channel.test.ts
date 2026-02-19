import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockClient, mockInteraction } from "../../helpers.js";

describe("setup channel command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const prisma = mockPrisma();

    const mod = await esmock("../../../src/commands/setup/channel.js", {
      "../../../src/utils/logger.js": { default: logger },
      "../../../src/database/index.js": { prisma },
      "../../../src/utils/guildDatabase.js": { guildExists: sinon.stub().resolves(true) },
    });

    return { handler: mod.default, logger, prisma };
  }

  it("should return early when no guildId", async () => {
    const { handler } = await loadModule();
    const interaction = mockInteraction({ guildId: null });

    await handler(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).called).to.be.false;
  });

  it("should update guild with channel and reply", async () => {
    const { handler, prisma } = await loadModule();
    const interaction = mockInteraction();
    const channel = { id: "ch-123", name: "general" };
    (interaction.options.getChannel as sinon.SinonStub).withArgs("channel", true).returns(channel);

    await handler(mockClient() as never, interaction as never);

    expect(prisma.guild.update.calledOnce).to.be.true;
    const updateArgs = prisma.guild.update.firstCall.args[0];
    expect(updateArgs.data.motivationChannelId).to.equal("ch-123");
    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
  });

  it("should reply with error on failure", async () => {
    const { handler, prisma, logger } = await loadModule();
    prisma.guild.update.rejects(new Error("DB error"));
    const interaction = mockInteraction();
    (interaction.options.getChannel as sinon.SinonStub).withArgs("channel", true).returns({ id: "ch-123" });

    await handler(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).to.be.true;
    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
  });
});
