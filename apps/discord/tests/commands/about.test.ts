import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockClient, mockInteraction, mockEnv } from "../helpers.js";

describe("about command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const env = mockEnv();

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/env.js", () => ({ default: env }));

    const mod = await import("../../src/commands/about.js");

    return { execute: mod.execute, logger, env };
  }

  it("should reply with an embed containing bot info", async () => {
    const { execute } = await loadModule();
    const client = mockClient();
    const interaction = mockInteraction();

    await execute(client as never, interaction as never);

    expect((interaction.deferReply as sinon.SinonStub).calledOnce).toBe(true);
    expect((interaction.editReply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.editReply as sinon.SinonStub).firstCall.args[0];
    expect(Array.isArray(replyArgs.embeds)).toBe(true);
    expect(replyArgs.embeds).toHaveLength(1);
  });

  it("should reply with error on failure", async () => {
    const { execute, logger } = await loadModule();
    const client = mockClient();
    const interaction = mockInteraction();
    (interaction.editReply as sinon.SinonStub).onFirstCall().rejects(new Error("fail"));
    (interaction.editReply as sinon.SinonStub).onSecondCall().resolves();

    await execute(client as never, interaction as never);

    expect(logger.commands.error.calledOnce).toBe(true);
  });
});
