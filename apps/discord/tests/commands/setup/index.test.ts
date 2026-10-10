import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { InteractionContextType } from "discord.js";
import { mockClient, mockDb, mockInteraction, mockLogger } from "../../helpers.js";

describe("/setup router", () => {
  const restores: (() => void)[] = [];

  afterEach(() => {
    sinon.restore();
    while (restores.length > 0) {
      restores.pop()!();
    }
  });

  async function loadRouter() {
    mock.module("../../../src/utils/logger.js", () => ({ default: mockLogger() }));
    mock.module("../../../src/database/index.js", () => ({ db: mockDb(), queryClient: () => Promise.resolve([]) }));
    const mod = await import("../../../src/commands/setup/index.js");
    const map = mod.setupRoutes as Map<string, unknown>;
    const stubs = new Map<string, sinon.SinonStub>();
    for (const [key, original] of map) {
      const stub = sinon.stub().resolves();
      stubs.set(key, stub);
      map.set(key, stub);
      restores.push(() => map.set(key, original));
    }
    return { ...mod, stubs };
  }

  function makeInteraction(subcommand: string, admin = true) {
    const interaction = mockInteraction({ memberPermissions: { has: sinon.stub().returns(admin) } });
    (interaction.options.getSubcommand as sinon.SinonStub).returns(subcommand);
    return interaction;
  }

  it("is registered for server contexts only", async () => {
    const { slashCommand } = await loadRouter();
    expect(slashCommand.toJSON().contexts).toEqual([InteractionContextType.Guild]);
  });

  it("has a route for every subcommand in the command builder, and no others", async () => {
    const { slashCommand, setupRoutes } = await loadRouter();
    const declared = (slashCommand.toJSON().options ?? []).map((o) => o.name).sort();
    expect([...setupRoutes.keys()].sort()).toEqual(declared);
  });

  it("dispatches each subcommand to its own handler for administrators", async () => {
    const { execute, stubs } = await loadRouter();
    const client = mockClient();

    for (const [name, stub] of stubs) {
      const interaction = makeInteraction(name);
      await execute(client as never, interaction as never);
      expect(stub.calledOnceWithExactly(client, interaction)).toBe(true);
      stub.resetHistory();
    }
  });

  it("refuses members without Administrator before any handler runs", async () => {
    const { execute, stubs } = await loadRouter();
    const interaction = makeInteraction("channel", false);

    await execute(mockClient() as never, interaction as never);

    expect([...stubs.values()].some((s) => s.called)).toBe(false);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    expect((interaction.reply as sinon.SinonStub).firstCall.args[0].content).toContain("Administrator");
  });

  it("replies 'Invalid subcommand' for an unknown subcommand", async () => {
    const { execute } = await loadRouter();
    const interaction = makeInteraction("reset");

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).firstCall.args[0].content).toBe("Invalid subcommand");
  });
});
