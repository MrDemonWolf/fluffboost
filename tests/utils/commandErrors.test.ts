import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockInteraction } from "../helpers.js";

describe("commandErrors.withCommandLogging", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function load() {
    const logger = mockLogger();
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const mod = await import("../../src/utils/commandErrors.js");
    return { logger, mod };
  }

  it("logs executing + success when handler resolves", async () => {
    const { logger, mod } = await load();
    const interaction = mockInteraction();
    await mod.withCommandLogging("cmd", interaction as never, async () => {
      // no-op
    });

    expect(logger.commands.executing.calledOnce).toBe(true);
    expect(logger.commands.success.calledOnce).toBe(true);
    expect(logger.commands.error.called).toBe(false);
  });

  it("logs error and replies safely when handler throws", async () => {
    const { logger, mod } = await load();
    const interaction = mockInteraction();
    await mod.withCommandLogging("cmd", interaction as never, async () => {
      throw new Error("boom");
    });

    expect(logger.commands.error.calledOnce).toBe(true);
    expect(logger.commands.success.called).toBe(false);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
  });

  it("uses custom errorMessage when provided", async () => {
    const { mod } = await load();
    const interaction = mockInteraction();
    await mod.withCommandLogging("cmd", interaction as never, async () => {
      throw new Error("boom");
    }, "Custom failure text");

    const content = (interaction.reply as sinon.SinonStub).firstCall.args[0].content;
    expect(content).toBe("Custom failure text");
  });
});
