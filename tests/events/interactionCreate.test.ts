import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockClient } from "../helpers.js";

describe("interactionCreateEvent", () => {
  afterEach(() => {
    sinon.restore();
  });

  function makeCommandInteraction(commandName: string) {
    return {
      user: { id: "u1", username: "testuser" },
      commandName,
      isCommand: sinon.stub().returns(true),
      isChatInputCommand: sinon.stub().returns(true),
      isAutocomplete: sinon.stub().returns(false),
      reply: sinon.stub().resolves(),
    };
  }

  async function loadModule(logger: ReturnType<typeof mockLogger>) {
    const executeStub = sinon.stub().resolves();
    const commandModule = { execute: executeStub, default: { execute: executeStub } };
    const setupAutocomplete = sinon.stub().resolves();

    const { interactionCreateEvent } = await esmock(
      "../../src/events/interactionCreate.js",
      {
        "../../src/utils/logger.js": { default: logger },
        "../../src/commands/help.js": { default: { execute: executeStub } },
        "../../src/commands/about.js": { default: { execute: executeStub } },
        "../../src/commands/changelog.js": { default: { execute: executeStub } },
        "../../src/commands/quote.js": { default: { execute: executeStub } },
        "../../src/commands/suggestion.js": { default: { execute: executeStub } },
        "../../src/commands/invite.js": { default: { execute: executeStub } },
        "../../src/commands/admin/index.js": { default: { execute: executeStub } },
        "../../src/commands/setup/index.js": { default: { execute: executeStub }, setupAutocomplete },
        "../../src/commands/premium.js": { default: { execute: executeStub } },
        "../../src/commands/owner/index.js": { default: { execute: executeStub } },
      },
    );

    return { interactionCreateEvent, executeStub, setupAutocomplete };
  }

  it("should route a known command to its handler", async () => {
    const logger = mockLogger();
    const { interactionCreateEvent, executeStub } = await loadModule(logger);

    const client = mockClient();
    const interaction = makeCommandInteraction("help");

    await interactionCreateEvent(client, interaction);
    expect(executeStub.called).to.be.true;
    expect(logger.commands.success.called).to.be.true;
  });

  it("should handle autocomplete interactions for setup", async () => {
    const logger = mockLogger();
    const { interactionCreateEvent, setupAutocomplete } = await loadModule(logger);

    const interaction = {
      user: { id: "u1", username: "testuser" },
      commandName: "setup",
      isCommand: sinon.stub().returns(false),
      isAutocomplete: sinon.stub().returns(true),
      options: { getFocused: sinon.stub().returns({ name: "timezone", value: "Amer" }) },
      respond: sinon.stub().resolves(),
    };

    await interactionCreateEvent(mockClient(), interaction);
    expect(setupAutocomplete.calledOnce).to.be.true;
  });

  it("should return early for non-command, non-autocomplete interactions", async () => {
    const logger = mockLogger();
    const { interactionCreateEvent, executeStub } = await loadModule(logger);

    const interaction = {
      user: { id: "u1", username: "testuser" },
      isCommand: sinon.stub().returns(false),
      isAutocomplete: sinon.stub().returns(false),
    };

    await interactionCreateEvent(mockClient(), interaction);
    expect(executeStub.called).to.be.false;
  });

  it("should log a warning for unknown command names", async () => {
    const logger = mockLogger();
    const { interactionCreateEvent } = await loadModule(logger);

    const interaction = makeCommandInteraction("nonexistent");
    await interactionCreateEvent(mockClient(), interaction);
    expect(logger.commands.warn.called).to.be.true;
  });

  it("should catch handler exceptions and reply with error message", async () => {
    const logger = mockLogger();
    const executeStub = sinon.stub().rejects(new Error("boom"));

    const { interactionCreateEvent } = await esmock(
      "../../src/events/interactionCreate.js",
      {
        "../../src/utils/logger.js": { default: logger },
        "../../src/commands/help.js": { default: { execute: executeStub } },
        "../../src/commands/about.js": { default: { execute: sinon.stub().resolves() } },
        "../../src/commands/changelog.js": { default: { execute: sinon.stub().resolves() } },
        "../../src/commands/quote.js": { default: { execute: sinon.stub().resolves() } },
        "../../src/commands/suggestion.js": { default: { execute: sinon.stub().resolves() } },
        "../../src/commands/invite.js": { default: { execute: sinon.stub().resolves() } },
        "../../src/commands/admin/index.js": { default: { execute: sinon.stub().resolves() } },
        "../../src/commands/setup/index.js": {
          default: { execute: sinon.stub().resolves() },
          setupAutocomplete: sinon.stub().resolves(),
        },
        "../../src/commands/premium.js": { default: { execute: sinon.stub().resolves() } },
        "../../src/commands/owner/index.js": { default: { execute: sinon.stub().resolves() } },
      },
    );

    const interaction = makeCommandInteraction("help");
    await interactionCreateEvent(mockClient(), interaction);

    expect(logger.error.called).to.be.true;
    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("error");
  });
});
