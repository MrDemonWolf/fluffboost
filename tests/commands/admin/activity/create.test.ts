import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockInteraction, mockClient } from "../../../helpers.js";

describe("admin activity create command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const prisma = mockPrisma();

    const mod = await esmock("../../../../src/commands/admin/activity/create.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().resolves(true) },
    });

    return { handler: mod.default, logger, prisma };
  }

  async function loadModuleNotPermitted() {
    const logger = mockLogger();
    const prisma = mockPrisma();

    const mod = await esmock("../../../../src/commands/admin/activity/create.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().resolves(false) },
    });

    return { handler: mod.default, logger, prisma };
  }

  function makeInteraction(activity: string, type: string, url: string | null = null) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("activity", true).returns(activity);
    getStringStub.withArgs("type", true).returns(type);
    getStringStub.withArgs("url").returns(url);
    return interaction;
  }

  it("should return early when user is not permitted", async () => {
    const { handler } = await loadModuleNotPermitted();
    const interaction = makeInteraction("Gaming", "Playing");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).called).to.be.false;
  });

  it("should reply when empty activity provided", async () => {
    const { handler } = await loadModule();
    const interaction = makeInteraction("  ", "Playing");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("provide an activity");
  });

  it("should reply when empty type provided", async () => {
    const { handler } = await loadModule();
    const interaction = makeInteraction("Gaming", "  ");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("provide a type");
  });

  it("should create activity and reply on success", async () => {
    const { handler, prisma } = await loadModule();
    prisma.discordActivity.create.resolves({ id: "a1", activity: "Gaming", type: "Playing", url: null });

    const interaction = makeInteraction("Gaming", "Playing");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(prisma.discordActivity.create.calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("Activity added");
  });

  it("should create activity with url when provided", async () => {
    const { handler, prisma } = await loadModule();
    prisma.discordActivity.create.resolves({
      id: "a1",
      activity: "Streaming",
      type: "Streaming",
      url: "https://twitch.tv/test",
    });

    const interaction = makeInteraction("Streaming", "Streaming", "https://twitch.tv/test");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(prisma.discordActivity.create.calledOnce).to.be.true;
    const createArgs = prisma.discordActivity.create.firstCall.args[0];
    expect(createArgs.data.url).to.equal("https://twitch.tv/test");
  });

  it("should reply with error on database failure", async () => {
    const { handler, prisma, logger } = await loadModule();
    prisma.discordActivity.create.rejects(new Error("DB error"));

    const interaction = makeInteraction("Gaming", "Playing");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(logger.commands.error.calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("error occurred");
  });
});
