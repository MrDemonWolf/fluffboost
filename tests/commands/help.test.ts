import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPosthog, mockClient, mockInteraction } from "../helpers.js";

describe("help command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const posthog = mockPosthog();

    const mod = await esmock("../../src/commands/help.js", {
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/posthog.js": { default: posthog },
    });

    return { execute: mod.execute, logger, posthog };
  }

  it("should reply with command list", async () => {
    const { execute } = await loadModule();
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("/about");
    expect(replyArgs.content).to.include("/quote");
    expect(replyArgs.flags).to.exist;
  });

  it("should capture posthog event", async () => {
    const { execute, posthog } = await loadModule();
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect(posthog.capture.calledOnce).to.be.true;
    expect(posthog.capture.firstCall.args[0].event).to.equal("help command used");
  });

  it("should reply with error on failure", async () => {
    const { execute, logger } = await loadModule();
    const interaction = mockInteraction();
    (interaction.reply as sinon.SinonStub).onFirstCall().rejects(new Error("fail"));
    (interaction.reply as sinon.SinonStub).onSecondCall().resolves();

    await execute(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).to.be.true;
  });
});
