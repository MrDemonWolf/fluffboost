import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockInteraction, mockClient } from "../../../helpers.js";

describe("admin activity list command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const prisma = mockPrisma();

    const mod = await esmock("../../../../src/commands/admin/activity/list.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().resolves(true) },
    });

    return { handler: mod.default, logger, prisma };
  }

  async function loadModuleNotPermitted() {
    const logger = mockLogger();
    const prisma = mockPrisma();

    const mod = await esmock("../../../../src/commands/admin/activity/list.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().resolves(false) },
    });

    return { handler: mod.default, logger, prisma };
  }

  it("should return early when user is not permitted", async () => {
    const { handler } = await loadModuleNotPermitted();
    const interaction = mockInteraction();

    await handler(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).called).to.be.false;
  });

  it("should reply when no activities found", async () => {
    const { handler, prisma } = await loadModule();
    prisma.discordActivity.findMany.resolves([]);

    const interaction = mockInteraction();
    await handler(mockClient() as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("No activities found");
  });

  it("should reply with activities file when activities exist", async () => {
    const { handler, prisma } = await loadModule();
    prisma.discordActivity.findMany.resolves([
      { id: "a1", activity: "Gaming", type: "Playing", url: null, createdAt: new Date() },
      { id: "a2", activity: "Streaming", type: "Streaming", url: "https://twitch.tv/test", createdAt: new Date() },
    ]);

    const interaction = mockInteraction();
    await handler(mockClient() as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.files).to.be.an("array").with.lengthOf(1);
    expect(replyArgs.files[0].name).to.equal("activities.txt");
  });

  it("should reply with error on database failure", async () => {
    const { handler, prisma, logger } = await loadModule();
    prisma.discordActivity.findMany.rejects(new Error("DB error"));

    const interaction = mockInteraction();
    await handler(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("error occurred");
  });
});
