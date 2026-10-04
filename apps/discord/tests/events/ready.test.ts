import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockClient } from "../helpers.js";

describe("ready event", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const pruneGuilds = sinon.stub().resolves();
    const ensureGuildExists = sinon.stub().resolves();
    const setActivity = sinon.stub().resolves();
    const reconcilePremium = sinon.stub().resolves();

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    // Mock the thin dep-shim instead of guildDatabase.js / setActivity.js so
    // utility test files aren't poisoned by bun:test's process-global
    // mock.module registry.
    mock.module("../../src/events/readyDeps.js", () => ({
      pruneGuilds,
      ensureGuildExists,
      setActivity,
      reconcilePremium,
    }));
    mock.module("../../src/events/commandRegistry.js", () => ({
      commandRegistry: {},
      setupAutocomplete: sinon.stub(),
      slashCommands: Array.from({ length: 10 }, (_, i) => ({ name: `cmd${i}` })),
    }));
    const mod = await import("../../src/events/ready.js");

    return { readyEvent: mod.readyEvent, logger, pruneGuilds, ensureGuildExists, setActivity, reconcilePremium };
  }

  it("should log ready with username and guild count", async () => {
    const { readyEvent, logger } = await loadModule();
    const client = mockClient();
    const commandsSet = sinon.stub().resolves();
    const commandsFetch = sinon.stub().resolves(new Map([["help", { name: "help" }]]));
    (client as Record<string, unknown>).application = {
      commands: { set: commandsSet, fetch: commandsFetch },
    };

    await readyEvent(client as never);

    expect(logger.discord.ready.calledOnce).toBe(true);
  });

  it("should prune guilds and ensure guilds exist", async () => {
    const { readyEvent, pruneGuilds, ensureGuildExists } = await loadModule();
    const client = mockClient();
    const commandsSet = sinon.stub().resolves();
    const commandsFetch = sinon.stub().resolves(new Map());
    (client as Record<string, unknown>).application = {
      commands: { set: commandsSet, fetch: commandsFetch },
    };

    await readyEvent(client as never);

    expect(pruneGuilds.calledOnce).toBe(true);
    expect(ensureGuildExists.calledOnce).toBe(true);
  });

  it("should register slash commands", async () => {
    const { readyEvent } = await loadModule();
    const client = mockClient();
    const commandsSet = sinon.stub().resolves();
    const commandsFetch = sinon.stub().resolves(new Map());
    (client as Record<string, unknown>).application = {
      commands: { set: commandsSet, fetch: commandsFetch },
    };

    await readyEvent(client as never);

    expect(commandsSet.calledOnce).toBe(true);
    const commands = commandsSet.firstCall.args[0];
    expect(Array.isArray(commands)).toBe(true);
    expect(commands).toHaveLength(10);
  });

  it("should set activity after ready", async () => {
    const { readyEvent, setActivity } = await loadModule();
    const client = mockClient();
    const commandsSet = sinon.stub().resolves();
    const commandsFetch = sinon.stub().resolves(new Map());
    (client as Record<string, unknown>).application = {
      commands: { set: commandsSet, fetch: commandsFetch },
    };

    await readyEvent(client as never);

    expect(setActivity.calledOnce).toBe(true);
  });

  it("should handle errors during ready event", async () => {
    const { readyEvent, logger, pruneGuilds } = await loadModule();
    pruneGuilds.rejects(new Error("DB error"));
    const client = mockClient();

    await expect(readyEvent(client as never)).rejects.toThrow("DB error");
    expect(logger.error.called).toBe(true);
  });

  it("reconciles subscriptions before registering commands and starting activity", async () => {
    const { readyEvent, ensureGuildExists, reconcilePremium, setActivity } = await loadModule();
    const client = mockClient();
    const commandsSet = sinon.stub().resolves([]);
    client.application = { commands: { set: commandsSet } } as never;
    await readyEvent(client as never);
    expect(ensureGuildExists.calledBefore(reconcilePremium)).toBe(true);
    expect(reconcilePremium.calledBefore(commandsSet)).toBe(true);
    expect(commandsSet.calledBefore(setActivity)).toBe(true);
  });

  it("propagates registration errors so startup can restart", async () => {
    const { readyEvent, setActivity } = await loadModule();
    const client = mockClient();
    client.application = { commands: { set: sinon.stub().rejects(new Error("Discord unavailable")) } } as never;
    await expect(readyEvent(client as never)).rejects.toThrow("Discord unavailable");
    expect(setActivity.called).toBe(false);
  });
});
