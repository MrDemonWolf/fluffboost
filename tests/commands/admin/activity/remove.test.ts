import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockInteraction, mockClient } from "../../../helpers.js";

describe("admin activity remove command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const prisma = mockPrisma();

    const mod = await esmock("../../../../src/commands/admin/activity/remove.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().returns(true) },
    });

    return { handler: mod.default, logger, prisma };
  }

  async function loadModuleNotPermitted() {
    const logger = mockLogger();
    const prisma = mockPrisma();

    const mod = await esmock("../../../../src/commands/admin/activity/remove.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().returns(false) },
    });

    return { handler: mod.default, logger, prisma };
  }

  function makeInteraction(activityId: string) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("activity_id", true).returns(activityId);
    return interaction;
  }

  it("should return early when user is not permitted", async () => {
    const { handler } = await loadModuleNotPermitted();
    const interaction = makeInteraction("a1");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).called).to.be.false;
  });

  it("should reply when empty activity ID provided", async () => {
    const { handler } = await loadModule();
    const interaction = makeInteraction("  ");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("valid activity ID");
  });

  it("should reply when activity not found", async () => {
    const { handler, prisma } = await loadModule();
    prisma.discordActivity.findUnique.resolves(null);

    const interaction = makeInteraction("a-nonexistent");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("No activity found");
  });

  it("should delete activity and reply on success", async () => {
    const { handler, prisma } = await loadModule();
    prisma.discordActivity.findUnique.resolves({ id: "a1", activity: "Gaming", type: "Playing" });

    const interaction = makeInteraction("a1");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(prisma.discordActivity.delete.calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("deleted");
  });

  it("should reply with error on database failure", async () => {
    const { handler, prisma, logger } = await loadModule();
    prisma.discordActivity.findUnique.rejects(new Error("DB error"));

    const interaction = makeInteraction("a1");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(logger.commands.error.calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("error occurred");
  });
});
