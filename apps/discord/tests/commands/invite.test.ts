import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockClient, mockInteraction } from "../helpers.js";

describe("invite command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));

    const mod = await import("../../src/commands/invite.js");

    return { execute: mod.execute, logger };
  }

  it("should reply with invite link", async () => {
    const { execute } = await loadModule();
    const client = mockClient();
    (client as Record<string, unknown>).generateInvite = sinon.stub().returns("https://discord.gg/test");
    const interaction = mockInteraction();

    await execute(client as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("https://discord.gg/test");
  });

  it("should reply with error on failure", async () => {
    const { execute, logger } = await loadModule();
    const client = mockClient();
    (client as Record<string, unknown>).generateInvite = sinon.stub().throws(new Error("fail"));
    const interaction = mockInteraction();

    await execute(client as never, interaction as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
  });
});
