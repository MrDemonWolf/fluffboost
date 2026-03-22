import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { MessageFlags } from "discord.js";
import { mockLogger, mockClient, mockInteraction } from "../helpers.js";

describe("changelog command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));

    const mod = await import("../../src/commands/changelog.js");

    return { execute: mod.execute, logger };
  }

  it("should reply with changelog embed", async () => {
    const { execute } = await loadModule();
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(Array.isArray(replyArgs.embeds)).toBe(true);
    expect(replyArgs.embeds).toHaveLength(1);
    expect(replyArgs.flags).toBe(MessageFlags.Ephemeral);
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
