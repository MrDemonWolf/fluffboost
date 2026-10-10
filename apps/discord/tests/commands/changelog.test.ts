import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { MessageFlags } from "discord.js";
import { mockLogger, mockClient, mockEnv, mockInteraction } from "../helpers.js";
import type { MockEnv } from "../helpers.js";


describe("changelog command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(nodeEnv: MockEnv["NODE_ENV"] = "test") {
    const logger = mockLogger();

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/env.js", () => ({ default: mockEnv({ NODE_ENV: nodeEnv }) }));

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

  function commandsField(interaction: ReturnType<typeof mockInteraction>): string {
    const embed = (interaction.reply as sinon.SinonStub).firstCall.args[0].embeds[0];
    return embed.data.fields.find((f: { name: string }) => f.name === "New Commands").value;
  }

  it("does not advertise unregistered owner tools on the production bot", async () => {
    const { execute } = await loadModule("production");
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect(commandsField(interaction)).not.toContain("/owner");
  });

  it("lists the owner tools outside production", async () => {
    const { execute } = await loadModule("development");
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect(commandsField(interaction)).toContain("/owner premium test-create");
  });

  it("derives the free schedule copy and carries no misleading 'now' timestamp", async () => {
    const { execute } = await loadModule();
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    const embed = (interaction.reply as sinon.SinonStub).firstCall.args[0].embeds[0];
    expect(embed.data.timestamp).toBeUndefined();
    const schedules = embed.data.fields.find((f: { name: string }) => f.name === "Per-Server Schedules").value;
    expect(schedules).toContain("daily at 8:00 AM (America/Chicago)");
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
