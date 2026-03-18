import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockPosthog, mockClient, mockInteraction } from "../helpers.js";

describe("help command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const posthog = mockPosthog();

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/posthog.js", () => ({ default: posthog }));

    const mod = await import("../../src/commands/help.js");

    return { execute: mod.execute, logger, posthog };
  }

  it("should reply with command list", async () => {
    const { execute } = await loadModule();
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("/about");
    expect(replyArgs.content).toContain("/quote");
    expect(replyArgs.flags).toBeDefined();
  });

  it("should capture posthog event", async () => {
    const { execute, posthog } = await loadModule();
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect(posthog.capture.calledOnce).toBe(true);
    expect(posthog.capture.firstCall.args[0].event).toBe("help command used");
  });

  it("should reply with error on failure", async () => {
    const { execute, logger } = await loadModule();
    const interaction = mockInteraction();
    (interaction.reply as sinon.SinonStub).onFirstCall().rejects(new Error("fail"));
    (interaction.reply as sinon.SinonStub).onSecondCall().resolves();

    await execute(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).toBe(true);
  });
});
