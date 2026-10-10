import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { MessageFlags } from "discord.js";
import { mockPermissions } from "../permissionsMock.js";
import { mockClient, mockDb, mockEnv, mockInteraction, mockLogger } from "../../helpers.js";

describe("/admin router", () => {
  const restores: (() => void)[] = [];

  afterEach(() => {
    sinon.restore();
    while (restores.length > 0) {
      restores.pop()!();
    }
  });

  async function loadRouter(permitted = true) {
    const logger = mockLogger();
    const db = mockDb();
    mock.module("../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../../src/utils/env.js", () => ({ default: mockEnv() }));
    const isUserPermitted = await mockPermissions(permitted);
    // Destructure statically so static analysis can see which exports the suite consumes.
    const { slashCommand, execute, adminRoutes } = await import("../../../src/commands/admin/index.js");
    return { slashCommand, execute, adminRoutes, isUserPermitted, logger, db };
  }

  /** Swap every route for a stub without mocking the subcommand modules process-wide. */
  function stubRoutes(routes: ReadonlyMap<string, unknown>) {
    const map = routes as Map<string, unknown>;
    const stubs = new Map<string, sinon.SinonStub>();
    for (const [key, original] of map) {
      const stub = sinon.stub().resolves();
      stubs.set(key, stub);
      map.set(key, stub);
      restores.push(() => map.set(key, original));
    }
    return stubs;
  }

  function makeInteraction(group: string | null, subcommand: string) {
    const interaction = mockInteraction();
    (interaction.options.getSubcommandGroup as sinon.SinonStub).returns(group);
    (interaction.options.getSubcommand as sinon.SinonStub).returns(subcommand);
    return interaction;
  }

  it("has a route for every group/subcommand in the command builder, and no others", async () => {
    const { slashCommand, adminRoutes } = await loadRouter();
    const declared: string[] = [];
    for (const group of slashCommand.toJSON().options ?? []) {
      for (const sub of (group as { options?: { name: string }[] }).options ?? []) {
        declared.push(`${group.name} ${sub.name}`);
      }
    }
    expect([...adminRoutes.keys()].sort()).toEqual(declared.sort());
  });

  it("dispatches each group/subcommand pair to its own handler exactly once", async () => {
    const { execute, adminRoutes } = await loadRouter();
    const stubs = stubRoutes(adminRoutes);
    const client = mockClient();

    for (const [key, stub] of stubs) {
      const [group, subcommand] = key.split(" ") as [string, string];
      const interaction = makeInteraction(group, subcommand);

      await execute(client as never, interaction as never);

      expect(stub.calledOnceWithExactly(client, interaction)).toBe(true);
      for (const [otherKey, other] of stubs) {
        if (otherKey !== key) {
          expect(other.called).toBe(false);
        }
      }
      stub.resetHistory();
    }
  });

  it("authorizes once at the router so no subcommand runs for a non-allowed user", async () => {
    const { execute, adminRoutes, isUserPermitted } = await loadRouter(false);
    const stubs = stubRoutes(adminRoutes);
    const interaction = makeInteraction("quote", "create");

    await execute(mockClient() as never, interaction as never);

    expect(isUserPermitted.calledOnce).toBe(true);
    expect([...stubs.values()].some((s) => s.called)).toBe(false);
    expect((interaction.options.getSubcommand as sinon.SinonStub).called).toBe(false);
  });

  it("replies 'Invalid subcommand' for an unknown pair", async () => {
    const { execute, adminRoutes } = await loadRouter();
    stubRoutes(adminRoutes);
    const interaction = makeInteraction("quote", "edit");

    await execute(mockClient() as never, interaction as never);

    const reply = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(reply.content).toBe("Invalid subcommand");
    expect(reply.flags).toBe(MessageFlags.Ephemeral);
  });

  it("replies 'Invalid subcommand' for an unknown group", async () => {
    const { execute, adminRoutes } = await loadRouter();
    stubRoutes(adminRoutes);
    const interaction = makeInteraction("billing", "list");

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).firstCall.args[0].content).toBe("Invalid subcommand");
  });

  it("logs a real subcommand once, not again at the router (no nested command logging)", async () => {
    const { execute, logger } = await loadRouter();
    const interaction = makeInteraction("suggestion", "stats");

    await execute(mockClient() as never, interaction as never);

    expect(logger.commands.executing.callCount).toBe(1);
    expect(logger.commands.executing.firstCall.args[0]).toBe("admin suggestion stats");
    expect(logger.commands.success.callCount).toBe(1);
  });

  it("reports a failing subcommand once as an error and never as a success", async () => {
    const { execute, logger, db } = await loadRouter();
    db.select.throws(new Error("DB down"));
    const interaction = makeInteraction("quote", "list");

    await execute(mockClient() as never, interaction as never);

    expect(logger.commands.error.callCount).toBe(1);
    expect(logger.commands.success.called).toBe(false);
    expect((interaction.reply as sinon.SinonStub).callCount).toBe(1);
  });
});
