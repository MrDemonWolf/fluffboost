import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { UNIT_ENV_FIXTURE, mockClient, mockEnv, mockInteraction, mockLogger } from "../../helpers.js";
import type { MockEnv } from "../../helpers.js";

const OWNER_ID = "100000000000000999";

describe("/owner router", () => {
  const restores: (() => void)[] = [];

  afterEach(() => {
    sinon.restore();
    while (restores.length > 0) {
      restores.pop()!();
    }
  });

  async function loadRouter(nodeEnv: MockEnv["NODE_ENV"] = "test") {
    mock.module("../../../src/utils/logger.js", () => ({ default: mockLogger() }));
    mock.module("../../../src/utils/env.js", () => ({
      default: mockEnv({ ...UNIT_ENV_FIXTURE, NODE_ENV: nodeEnv, OWNER_ID }),
    }));
    const mod = await import("../../../src/commands/owner/index.js");
    const map = mod.ownerRoutes as Map<string, unknown>;
    const stubs = new Map<string, sinon.SinonStub>();
    for (const [key, original] of map) {
      const stub = sinon.stub().resolves();
      stubs.set(key, stub);
      map.set(key, stub);
      restores.push(() => map.set(key, original));
    }
    return { ...mod, stubs };
  }

  function makeInteraction(userId: string, group: string | null, subcommand: string) {
    const interaction = mockInteraction({ user: { id: userId, username: "someone" } });
    (interaction.options.getSubcommandGroup as sinon.SinonStub).returns(group);
    (interaction.options.getSubcommand as sinon.SinonStub).returns(subcommand);
    return interaction;
  }

  it("has a route for every group/subcommand in the command builder, and no others", async () => {
    const { slashCommand, ownerRoutes } = await loadRouter();
    const declared: string[] = [];
    for (const group of slashCommand.toJSON().options ?? []) {
      for (const sub of (group as { options?: { name: string }[] }).options ?? []) {
        declared.push(`${group.name} ${sub.name}`);
      }
    }
    expect([...ownerRoutes.keys()].sort()).toEqual(declared.sort());
  });

  it("dispatches each subcommand to its own handler for the owner outside production", async () => {
    const { execute, stubs } = await loadRouter("development");
    const client = mockClient();

    for (const [key, stub] of stubs) {
      const [group, subcommand] = key.split(" ") as [string, string];
      const interaction = makeInteraction(OWNER_ID, group, subcommand);

      await execute(client as never, interaction as never);

      expect(stub.calledOnceWithExactly(client, interaction)).toBe(true);
      stub.resetHistory();
    }
  });

  it("refuses non-owners before any handler runs", async () => {
    const { execute, stubs } = await loadRouter("development");
    const interaction = makeInteraction("not-the-owner", "premium", "test-create");

    await execute(mockClient() as never, interaction as never);

    expect([...stubs.values()].some((s) => s.called)).toBe(false);
    expect((interaction.reply as sinon.SinonStub).firstCall.args[0].content).toContain("Only the bot owner");
  });

  it("refuses even the owner on the production bot before any handler runs", async () => {
    const { execute, stubs } = await loadRouter("production");
    const interaction = makeInteraction(OWNER_ID, "premium", "test-create");

    await execute(mockClient() as never, interaction as never);

    expect([...stubs.values()].some((s) => s.called)).toBe(false);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    expect((interaction.reply as sinon.SinonStub).firstCall.args[0].content)
      .toContain("disabled on the production bot");
  });

  it("replies 'Invalid subcommand' for an unknown pair", async () => {
    const { execute } = await loadRouter("development");
    const interaction = makeInteraction(OWNER_ID, "premium", "test-purge");

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).firstCall.args[0].content).toBe("Invalid subcommand");
  });
});
