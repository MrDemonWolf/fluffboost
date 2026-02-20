import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockInteraction, mockEnv } from "../../../helpers.js";

describe("admin suggestion stats command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(permitted = true) {
    const logger = mockLogger();
    const prisma = mockPrisma();

    const mod = await esmock("../../../../src/commands/admin/suggestion/stats.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/database/index.js": { prisma },
      "../../../../src/utils/env.js": { default: mockEnv() },
      "../../../../src/utils/permissions.js": { isUserPermitted: sinon.stub().resolves(permitted) },
    });

    return { handler: mod.default, logger, prisma };
  }

  it("should deny unauthorized users", async () => {
    const { handler, prisma } = await loadModule(false);
    const interaction = mockInteraction();

    await handler({} as never, interaction as never);

    expect(prisma.suggestionQuote.count.called).to.be.false;
  });

  it("should return correct counts embed", async () => {
    const { handler, prisma } = await loadModule();
    const interaction = mockInteraction();

    const countStub = prisma.suggestionQuote.count;
    countStub.withArgs({ where: { status: "Pending" } }).resolves(5);
    countStub.withArgs({ where: { status: "Approved" } }).resolves(10);
    countStub.withArgs({ where: { status: "Rejected" } }).resolves(3);

    await handler({} as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    const embed = replyArgs.embeds[0];

    expect(embed.data.title).to.equal("Suggestion Statistics");

    const fields = embed.data.fields;
    expect(fields[0].value).to.equal("5"); // Pending
    expect(fields[1].value).to.equal("10"); // Approved
    expect(fields[2].value).to.equal("3"); // Rejected
    expect(fields[3].value).to.equal("18"); // Total
    expect(fields[4].value).to.equal("56%"); // Approval rate (10/18)
  });

  it("should handle zero suggestions", async () => {
    const { handler, prisma } = await loadModule();
    const interaction = mockInteraction();

    prisma.suggestionQuote.count.resolves(0);

    await handler({} as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    const fields = replyArgs.embeds[0].data.fields;
    expect(fields[4].value).to.equal("0%"); // 0% approval rate when no suggestions
  });
});
