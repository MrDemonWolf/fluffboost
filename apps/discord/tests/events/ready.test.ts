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

    mod.cancelReadyRetries();

    return {
      readyEvent: mod.readyEvent,
      cancelReadyRetries: mod.cancelReadyRetries,
      COMMAND_RETRY_BASE_MS: mod.COMMAND_RETRY_BASE_MS,
      COMMAND_RETRY_ATTEMPTS: mod.COMMAND_RETRY_ATTEMPTS,
      logger,
      pruneGuilds,
      ensureGuildExists,
      setActivity,
      reconcilePremium,
    };
  }

  it("should log ready with username and guild count", async () => {
    const { readyEvent, logger } = await loadModule();
    const client = mockClient();
    const commandsSet = sinon.stub().resolves();
    const commandsFetch = sinon.stub().resolves(new Map([["help", { name: "help" }]]));
    client.application = {
      commands: { set: commandsSet, fetch: commandsFetch },
    } as never;

    await readyEvent(client as never);

    expect(logger.discord.ready.calledOnce).toBe(true);
  });

  it("should prune guilds and ensure guilds exist", async () => {
    const { readyEvent, pruneGuilds, ensureGuildExists } = await loadModule();
    const client = mockClient();
    const commandsSet = sinon.stub().resolves();
    const commandsFetch = sinon.stub().resolves(new Map());
    client.application = {
      commands: { set: commandsSet, fetch: commandsFetch },
    } as never;

    await readyEvent(client as never);

    expect(pruneGuilds.calledOnce).toBe(true);
    expect(ensureGuildExists.calledOnce).toBe(true);
  });

  it("should register slash commands", async () => {
    const { readyEvent } = await loadModule();
    const client = mockClient();
    const commandsSet = sinon.stub().resolves();
    const commandsFetch = sinon.stub().resolves(new Map());
    client.application = {
      commands: { set: commandsSet, fetch: commandsFetch },
    } as never;

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
    client.application = {
      commands: { set: commandsSet, fetch: commandsFetch },
    } as never;

    await readyEvent(client as never);

    // Local scope: shard 0 must not broadcastEval while sibling shards are still spawning.
    expect(setActivity.calledOnceWithExactly(client, { scope: "local" })).toBe(true);
  });

  it("logs a prune failure and keeps starting up", async () => {
    const { readyEvent, logger, pruneGuilds, ensureGuildExists, setActivity } = await loadModule();
    pruneGuilds.rejects(new Error("DB error"));
    const client = mockClient();
    client.application = { commands: { set: sinon.stub().resolves([]) } } as never;

    await readyEvent(client as never);

    expect(logger.error.called).toBe(true);
    expect(ensureGuildExists.calledOnce).toBe(true);
    expect(setActivity.calledOnce).toBe(true);
  });

  it("does not fail startup when Premium reconciliation fails", async () => {
    const { readyEvent, logger, reconcilePremium, setActivity } = await loadModule();
    reconcilePremium.rejects(new Error("Discord 503"));
    const client = mockClient();
    const commandsSet = sinon.stub().resolves([]);
    client.application = { commands: { set: commandsSet } } as never;

    await readyEvent(client as never);

    expect(logger.error.calledWithMatch("Discord - Event (Ready)", sinon.match("Premium reconciliation"))).toBe(true);
    expect(commandsSet.calledOnce).toBe(true);
    expect(setActivity.calledOnce).toBe(true);
  });

  it("does not fail startup when the initial activity cannot be set", async () => {
    const { readyEvent, logger, setActivity } = await loadModule();
    setActivity.rejects(new Error("DB down"));
    const client = mockClient();
    client.application = { commands: { set: sinon.stub().resolves([]) } } as never;

    await readyEvent(client as never);

    expect(logger.error.calledWithMatch("Discord - Event (Ready)", sinon.match("Initial activity"))).toBe(true);
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

  it("keeps starting up and retries command registration with backoff", async () => {
    const { readyEvent, setActivity, COMMAND_RETRY_BASE_MS } = await loadModule();
    const clock = sinon.useFakeTimers();
    const client = mockClient();
    const set = sinon.stub();
    set.onFirstCall().rejects(new Error("Discord unavailable"));
    set.onSecondCall().rejects(new Error("Discord unavailable"));
    set.onThirdCall().resolves([{ name: "help" }]);
    client.application = { commands: { set } } as never;

    await readyEvent(client as never);
    expect(set.calledOnce).toBe(true);
    expect(setActivity.calledOnce).toBe(true);

    await clock.tickAsync(COMMAND_RETRY_BASE_MS - 1);
    expect(set.calledOnce).toBe(true);
    await clock.tickAsync(1);
    expect(set.calledTwice).toBe(true);

    // Second retry waits twice as long.
    await clock.tickAsync(COMMAND_RETRY_BASE_MS * 2);
    expect(set.calledThrice).toBe(true);

    await clock.tickAsync(60 * 60_000);
    expect(set.callCount).toBe(3);
  });

  it("gives up registration after the attempt cap", async () => {
    const { readyEvent, logger, COMMAND_RETRY_ATTEMPTS } = await loadModule();
    const clock = sinon.useFakeTimers();
    const client = mockClient();
    const set = sinon.stub().rejects(new Error("Discord unavailable"));
    client.application = { commands: { set } } as never;

    await readyEvent(client as never);
    await clock.tickAsync(24 * 60 * 60_000);

    expect(set.callCount).toBe(COMMAND_RETRY_ATTEMPTS);
    expect(logger.error.calledWithMatch("Discord - Slash Commands", sinon.match("giving up"))).toBe(true);
  });

  it("cancels pending registration retries on shutdown", async () => {
    const { readyEvent, cancelReadyRetries } = await loadModule();
    const clock = sinon.useFakeTimers();
    const client = mockClient();
    const set = sinon.stub().rejects(new Error("Discord unavailable"));
    client.application = { commands: { set } } as never;

    await readyEvent(client as never);
    cancelReadyRetries();
    await clock.tickAsync(24 * 60 * 60_000);

    expect(set.calledOnce).toBe(true);
  });

  it("only registers commands from shard 0", async () => {
    const { readyEvent } = await loadModule();
    const client = mockClient({ shard: { ids: [1] } });
    const set = sinon.stub().resolves([]);
    client.application = { commands: { set } } as never;

    await readyEvent(client as never);

    expect(set.called).toBe(false);
  });
});
