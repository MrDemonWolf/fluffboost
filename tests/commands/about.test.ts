import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPosthog, mockClient, mockInteraction, mockEnv } from "../helpers.js";

describe("about command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const posthog = mockPosthog();
    const env = mockEnv();

    const mod = await esmock("../../src/commands/about.js", {
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/posthog.js": { default: posthog },
      "../../src/utils/env.js": { default: env },
    });

    return { execute: mod.execute, logger, posthog, env };
  }

  it("should reply with an embed containing bot info", async () => {
    const { execute } = await loadModule();
    const client = mockClient();
    const interaction = mockInteraction();

    await execute(client as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.embeds).to.be.an("array").with.lengthOf(1);
  });

  it("should capture posthog event", async () => {
    const { execute, posthog } = await loadModule();
    const client = mockClient();
    const interaction = mockInteraction();

    await execute(client as never, interaction as never);

    expect(posthog.capture.calledOnce).to.be.true;
    expect(posthog.capture.firstCall.args[0].event).to.equal("about command used");
  });

  it("should reply with error on failure", async () => {
    const { execute, logger } = await loadModule();
    const client = mockClient();
    const interaction = mockInteraction();
    (interaction.reply as sinon.SinonStub).onFirstCall().rejects(new Error("fail"));
    (interaction.reply as sinon.SinonStub).onSecondCall().resolves();

    await execute(client as never, interaction as never);

    expect(logger.commands.error.calledOnce).to.be.true;
  });
});
