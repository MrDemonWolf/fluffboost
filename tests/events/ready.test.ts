import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
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

    const mod = await esmock("../../src/events/ready.js", {
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/guildDatabase.js": { pruneGuilds, ensureGuildExists },
      "../../src/worker/jobs/setActivity.js": { default: setActivity },
      "../../src/commands/help.js": { default: { slashCommand: { name: "help" } } },
      "../../src/commands/about.js": { default: { slashCommand: { name: "about" } } },
      "../../src/commands/quote.js": { default: { slashCommand: { name: "quote" } } },
      "../../src/commands/suggestion.js": { default: { slashCommand: { name: "suggestion" } } },
      "../../src/commands/invite.js": { default: { slashCommand: { name: "invite" } } },
      "../../src/commands/setup/index.js": { default: { slashCommand: { name: "setup" } } },
      "../../src/commands/admin/index.js": { default: { slashCommand: { name: "admin" } } },
      "../../src/commands/changelog.js": { default: { slashCommand: { name: "changelog" } } },
      "../../src/commands/premium.js": { default: { slashCommand: { name: "premium" } } },
      "../../src/commands/owner/index.js": { default: { slashCommand: { name: "owner" } } },
    });

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

    expect(logger.discord.ready.calledOnce).to.be.true;
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

    expect(pruneGuilds.calledOnce).to.be.true;
    expect(ensureGuildExists.calledOnce).to.be.true;
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

    expect(commandsSet.calledOnce).to.be.true;
    const commands = commandsSet.firstCall.args[0];
    expect(commands).to.be.an("array").with.lengthOf(10);
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

    expect(setActivity.calledOnce).to.be.true;
  });

  it("should handle errors during ready event", async () => {
    const { readyEvent, logger, pruneGuilds } = await loadModule();
    pruneGuilds.rejects(new Error("DB error"));
    const client = mockClient();

    await readyEvent(client as never);

    expect(logger.error.called).to.be.true;
  });
});
