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

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/guildDatabase.js", () => ({ pruneGuilds, ensureGuildExists }));
    mock.module("../../src/worker/jobs/setActivity.js", () => ({ default: setActivity }));
    mock.module("../../src/commands/help.js", () => ({ default: { slashCommand: { name: "help" } } }));
    mock.module("../../src/commands/about.js", () => ({ default: { slashCommand: { name: "about" } } }));
    mock.module("../../src/commands/quote.js", () => ({ default: { slashCommand: { name: "quote" } } }));
    mock.module("../../src/commands/suggestion.js", () => ({ default: { slashCommand: { name: "suggestion" } } }));
    mock.module("../../src/commands/invite.js", () => ({ default: { slashCommand: { name: "invite" } } }));
    mock.module("../../src/commands/setup/index.js", () => ({ default: { slashCommand: { name: "setup" } } }));
    mock.module("../../src/commands/admin/index.js", () => ({ default: { slashCommand: { name: "admin" } } }));
    mock.module("../../src/commands/changelog.js", () => ({ default: { slashCommand: { name: "changelog" } } }));
    mock.module("../../src/commands/premium.js", () => ({ default: { slashCommand: { name: "premium" } } }));
    mock.module("../../src/commands/owner/index.js", () => ({ default: { slashCommand: { name: "owner" } } }));
    const mod = await import("../../src/events/ready.js");

    return { readyEvent: mod.readyEvent, logger, pruneGuilds, ensureGuildExists, setActivity };
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

    await readyEvent(client as never);

    expect(logger.error.called).toBe(true);
  });
});
