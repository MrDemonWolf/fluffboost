import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPosthog, mockClient, mockInteraction } from "../helpers.js";

describe("invite command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const posthog = mockPosthog();

    const mod = await esmock("../../src/commands/invite.js", {
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/posthog.js": { default: posthog },
    });

    return { execute: mod.execute, logger, posthog };
  }

  it("should reply with invite link", async () => {
    const { execute } = await loadModule();
    const client = mockClient();
    (client as Record<string, unknown>).generateInvite = sinon.stub().returns("https://discord.gg/test");
    const interaction = mockInteraction();

    await execute(client as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("https://discord.gg/test");
  });

  it("should capture posthog event", async () => {
    const { execute, posthog } = await loadModule();
    const client = mockClient();
    (client as Record<string, unknown>).generateInvite = sinon.stub().returns("https://discord.gg/test");
    const interaction = mockInteraction();

    await execute(client as never, interaction as never);

    expect(posthog.capture.calledOnce).to.be.true;
    expect(posthog.capture.firstCall.args[0].event).to.equal("invite command used");
  });

  it("should reply with error on failure", async () => {
    const { execute, logger } = await loadModule();
    const client = mockClient();
    (client as Record<string, unknown>).generateInvite = sinon.stub().throws(new Error("fail"));
    const interaction = mockInteraction();

    await execute(client as never, interaction as never);

    expect(logger.commands.error.calledOnce).to.be.true;
    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
  });
});
