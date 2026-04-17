import { describe, it, expect, beforeEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockClient } from "../helpers.js";

// Shared stubs — reset per test
const logger = mockLogger();
const executeStub = sinon.stub().resolves();
const setupAutocomplete = sinon.stub().resolves();

// Top-level mocks to avoid cross-file interference
mock.module("../../src/utils/logger.js", () => ({ default: logger }));
mock.module("../../src/commands/help.js", () => ({ default: { execute: executeStub } }));
mock.module("../../src/commands/about.js", () => ({ default: { execute: executeStub } }));
mock.module("../../src/commands/changelog.js", () => ({ default: { execute: executeStub } }));
mock.module("../../src/commands/quote.js", () => ({ default: { execute: executeStub } }));
mock.module("../../src/commands/suggestion.js", () => ({ default: { execute: executeStub } }));
mock.module("../../src/commands/invite.js", () => ({ default: { execute: executeStub } }));
mock.module("../../src/commands/admin/index.js", () => ({ default: { execute: executeStub } }));
mock.module("../../src/commands/setup/index.js", () => ({
  default: { execute: executeStub },
  setupAutocomplete,
}));
mock.module("../../src/commands/premium.js", () => ({ default: { execute: executeStub } }));
mock.module("../../src/commands/owner/index.js", () => ({ default: { execute: executeStub } }));

const { interactionCreateEvent } = await import("../../src/events/interactionCreate.js");

function makeCommandInteraction(commandName: string) {
  return {
    user: { id: "u1", username: "testuser" },
    commandName,
    replied: false,
    deferred: false,
    isCommand: sinon.stub().returns(true),
    isChatInputCommand: sinon.stub().returns(true),
    isAutocomplete: sinon.stub().returns(false),
    reply: sinon.stub().resolves(),
    followUp: sinon.stub().resolves(),
  };
}

function resetStubs() {
  sinon.restore();
  executeStub.reset();
  executeStub.resolves();
  setupAutocomplete.reset();
  setupAutocomplete.resolves();
  for (const value of Object.values(logger)) {
    if (typeof value === "function" && "reset" in value) {
      (value as sinon.SinonStub).reset();
    } else if (typeof value === "object" && value !== null) {
      for (const sub of Object.values(value)) {
        if (typeof sub === "function" && "reset" in sub) {
          (sub as sinon.SinonStub).reset();
        }
      }
    }
  }
}

describe("interactionCreateEvent", () => {
  beforeEach(() => {
    resetStubs();
  });

  it("should route a known command to its handler", async () => {
    const client = mockClient();
    const interaction = makeCommandInteraction("help");

    await interactionCreateEvent(client, interaction);
    expect(executeStub.called).toBe(true);
  });

  it("should handle autocomplete interactions for setup", async () => {
    const interaction = {
      user: { id: "u1", username: "testuser" },
      commandName: "setup",
      isCommand: sinon.stub().returns(false),
      isAutocomplete: sinon.stub().returns(true),
      options: { getFocused: sinon.stub().returns({ name: "timezone", value: "Amer" }) },
      respond: sinon.stub().resolves(),
    };

    await interactionCreateEvent(mockClient(), interaction);
    expect(setupAutocomplete.calledOnce).toBe(true);
  });

  it("should return early for non-command, non-autocomplete interactions", async () => {
    const interaction = {
      user: { id: "u1", username: "testuser" },
      isCommand: sinon.stub().returns(false),
      isAutocomplete: sinon.stub().returns(false),
    };

    await interactionCreateEvent(mockClient(), interaction);
    expect(executeStub.called).toBe(false);
  });

  it("should log a warning for unknown command names", async () => {
    const interaction = makeCommandInteraction("nonexistent");
    await interactionCreateEvent(mockClient(), interaction);
    expect(logger.commands.warn.called).toBe(true);
  });

  it("should use followUp when interaction already replied and error occurs", async () => {
    executeStub.rejects(new Error("boom"));

    const interaction = makeCommandInteraction("help");
    interaction.replied = true;
    interaction.followUp = sinon.stub().resolves();

    await interactionCreateEvent(mockClient(), interaction);

    expect(logger.error.called).toBe(true);
    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
    expect((interaction.followUp as sinon.SinonStub).calledOnce).toBe(true);
  });

  it("should use followUp when interaction is deferred and error occurs", async () => {
    executeStub.rejects(new Error("boom"));

    const interaction = makeCommandInteraction("help");
    interaction.deferred = true;
    interaction.followUp = sinon.stub().resolves();

    await interactionCreateEvent(mockClient(), interaction);

    expect(logger.error.called).toBe(true);
    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
    expect((interaction.followUp as sinon.SinonStub).calledOnce).toBe(true);
  });

  it("should catch handler exceptions and reply with error message", async () => {
    executeStub.rejects(new Error("boom"));

    const interaction = makeCommandInteraction("help");
    await interactionCreateEvent(mockClient(), interaction);

    expect(logger.error.called).toBe(true);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("error");
  });
});
