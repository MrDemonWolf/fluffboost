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

  it("sums guild counts across shards", async () => {
    const { execute } = await loadModule();
    const client = mockClient({ shard: { broadcastEval: sinon.stub().resolves([3, 4]) } });
    const interaction = mockInteraction();

    await execute(client as never, interaction as never);

    const embed = (interaction.editReply as sinon.SinonStub).firstCall.args[0].embeds[0];
    expect(embed.data.description).toContain("currently in 7 servers");
  });

  it("falls back to this shard's count while another shard is spawning", async () => {
    const { execute, logger } = await loadModule();
    const guilds = { cache: new Map([["g1", {}], ["g2", {}]]) };
    const client = mockClient({
      guilds,
      shard: { broadcastEval: sinon.stub().rejects(new Error("Shard 1's Client is not ready")) },
    });
    const interaction = mockInteraction();

    await execute(client as never, interaction as never);

    expect(logger.warn.calledOnce).toBe(true);
    expect(logger.commands.error.called).toBe(false);
    expect((interaction.editReply as sinon.SinonStub).calledOnce).toBe(true);
    const embed = (interaction.editReply as sinon.SinonStub).firstCall.args[0].embeds[0];
    expect(embed.data.description).toContain("currently in at least 2 servers");
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
