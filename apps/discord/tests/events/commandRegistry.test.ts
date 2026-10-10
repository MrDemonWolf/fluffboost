import { describe, it, expect, mock } from "bun:test";
import sinon from "sinon";
import { UNIT_ENV_FIXTURE, mockDb, mockEnv, mockLogger } from "../helpers.js";
import type { MockEnv } from "../helpers.js";


// Real command modules are loaded; keep their infrastructure imports inert.
mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
mock.module("../../src/database/index.js", () => ({ db: mockDb(), queryClient: () => Promise.resolve([]) }));
mock.module("../../src/redis/index.js", () => ({
  default: { eval: sinon.stub().resolves(1) },
  bullRedis: {},
}));

/**
 * The registry reads NODE_ENV at module evaluation. A distinct query string
 * per environment forces a fresh evaluation and also bypasses the registry
 * mock that tests/events/interactionCreate.test.ts registers.
 */
async function loadRegistry(nodeEnv: MockEnv["NODE_ENV"]) {
  mock.module("../../src/utils/env.js", () => ({ default: mockEnv({ ...UNIT_ENV_FIXTURE, NODE_ENV: nodeEnv }) }));
  return import(`../../src/events/commandRegistry.js?env=${nodeEnv}`);
}

describe("commandRegistry", () => {
  it("never registers or routes the owner test tools on the production bot", async () => {
    const { commandRegistry, slashCommands } = await loadRegistry("production");

    const names = slashCommands.map((c: { name: string }) => c.name);
    expect(names).not.toContain("owner");
    expect(Object.hasOwn(commandRegistry, "owner")).toBe(false);
  });

  it("registers and routes the owner test tools outside production", async () => {
    const { commandRegistry, slashCommands } = await loadRegistry("development");

    const names = slashCommands.map((c: { name: string }) => c.name);
    expect(names).toContain("owner");
    expect(typeof commandRegistry.owner?.execute).toBe("function");
  });

  it("restricts server-only commands to guild contexts and leaves the rest unrestricted", async () => {
    const { slashCommands } = await loadRegistry("development");
    const contexts = Object.fromEntries(
      slashCommands.map((c: { toJSON: () => { name: string; contexts?: number[] } }) => {
        const json = c.toJSON();
        return [json.name, json.contexts];
      })
    );

    // InteractionContextType.Guild === 0
    expect(contexts["setup"]).toEqual([0]);
    expect(contexts["premium"]).toEqual([0]);
    expect(contexts["suggestion"]).toEqual([0]);
    for (const name of ["help", "about", "quote", "invite", "changelog"]) {
      expect(contexts[name]).toBeUndefined();
    }
  });
});
