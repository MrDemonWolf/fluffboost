import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockInteraction, mockEnv } from "../../../helpers.js";

describe("admin suggestion list command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: { env?: Record<string, unknown> } = {}) {
    const logger = mockLogger();
    const prisma = mockPrisma();
    const env = mockEnv(overrides.env);

    const mod = await esmock("../../../../src/commands/admin/suggestion/list.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/env.js": { default: env },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().returns(true) },
    });

    return { handler: mod.default, logger, prisma };
  }

  async function loadModuleUnauthorized() {
    const logger = mockLogger();
    const prisma = mockPrisma();

    const mod = await esmock("../../../../src/commands/admin/suggestion/list.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/env.js": { default: mockEnv() },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().returns(false) },
    });

    return { handler: mod.default, logger, prisma };
  }

  function makeInteraction(status: string | null = null) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("status").returns(status);
    return interaction;
  }

  it("should deny unauthorized users", async () => {
    const { handler, prisma } = await loadModuleUnauthorized();
    const interaction = makeInteraction();

    await handler({} as never, interaction as never, interaction.options as never);

    expect(prisma.suggestionQuote.findMany.called).to.be.false;
  });

  it("should return message when no suggestions found", async () => {
    const { handler } = await loadModule();
    const interaction = makeInteraction();

    await handler({} as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("No suggestions found");
  });

  it("should filter by status when provided", async () => {
    const { handler, prisma } = await loadModule();
    const interaction = makeInteraction("Pending");

    prisma.suggestionQuote.findMany.resolves([]);

    await handler({} as never, interaction as never, interaction.options as never);

    expect(prisma.suggestionQuote.findMany.calledOnce).to.be.true;
    const findArgs = prisma.suggestionQuote.findMany.firstCall.args[0];
    expect(findArgs.where.status).to.equal("Pending");
  });

  it("should return suggestions as a text file", async () => {
    const { handler, prisma } = await loadModule();
    const interaction = makeInteraction();

    prisma.suggestionQuote.findMany.resolves([
      { id: "s1", quote: "Be kind", author: "Anon", status: "Pending", addedBy: "user-1" },
      { id: "s2", quote: "Stay strong", author: "Me", status: "Approved", addedBy: "user-2" },
    ]);

    await handler({} as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.files).to.have.length(1);
    expect(replyArgs.files[0].name).to.equal("suggestions.txt");

    const content = replyArgs.files[0].attachment.toString();
    expect(content).to.include("s1");
    expect(content).to.include("Be kind");
    expect(content).to.include("s2");
    expect(content).to.include("Stay strong");
  });
});
