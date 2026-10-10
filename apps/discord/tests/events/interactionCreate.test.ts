import { describe, it, expect, beforeEach, mock } from "bun:test";
import sinon from "sinon";
import { MessageFlags } from "discord.js";
import { mockLogger, mockClient } from "../helpers.js";

// Shared stubs — reset per test
const logger = mockLogger();
const executeStub = sinon.stub().resolves();
const setupAutocomplete = sinon.stub().resolves();

// Mock only the registry + logger. Command modules themselves are NOT mocked
// here, so other test files that import real command modules aren't affected
// by bun:test's process-global mock.module registry.
mock.module("../../src/utils/logger.js", () => ({ default: logger }));
mock.module("../../src/events/commandRegistry.js", () => ({
  commandRegistry: {
    help: { execute: executeStub },
    about: { execute: executeStub },
    changelog: { execute: executeStub },
    quote: { execute: executeStub },
    invite: { execute: executeStub },
    suggestion: { execute: executeStub },
    admin: { execute: executeStub },
    setup: { execute: executeStub },
    premium: { execute: executeStub },
    owner: { execute: executeStub },
  },
  setupAutocomplete,
  slashCommands: Array.from({ length: 10 }, (_, i) => ({ name: `cmd${i}` })),
}));

const { interactionCreateEvent } = await import("../../src/events/interactionCreate.js");

function makeCommandInteraction(commandName: string) {
  return {
    id: "interaction-1",
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

    await interactionCreateEvent(client as never, interaction as never);
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

    await interactionCreateEvent(mockClient() as never, interaction as never);
    expect(setupAutocomplete.calledOnce).toBe(true);
  });

  it("should return early for non-command, non-autocomplete interactions", async () => {
    const interaction = {
      user: { id: "u1", username: "testuser" },
      isCommand: sinon.stub().returns(false),
      isAutocomplete: sinon.stub().returns(false),
    };

    await interactionCreateEvent(mockClient() as never, interaction as never);
    expect(executeStub.called).toBe(false);
  });

  it("should ignore context-menu command interactions without routing them", async () => {
    const interaction = makeCommandInteraction("help");
    interaction.isChatInputCommand = sinon.stub().returns(false);

    await interactionCreateEvent(mockClient() as never, interaction as never);

    expect(executeStub.called).toBe(false);
    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
  });

  it("should pass the narrowed chat-input interaction straight to the handler", async () => {
    const client = mockClient();
    const interaction = makeCommandInteraction("quote");

    await interactionCreateEvent(client as never, interaction as never);

    expect(executeStub.calledOnceWithExactly(client, interaction)).toBe(true);
  });

  it("should warn and acknowledge unknown command names ephemerally", async () => {
    const interaction = makeCommandInteraction("nonexistent");
    await interactionCreateEvent(mockClient() as never, interaction as never);

    expect(logger.commands.warn.called).toBe(true);
    expect(executeStub.called).toBe(false);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("no longer available");
    expect(replyArgs.flags).toBe(MessageFlags.Ephemeral);
  });

  it("should treat inherited object keys as unknown commands", async () => {
    const interaction = makeCommandInteraction("constructor");
    await interactionCreateEvent(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).firstCall.args[0].content).toContain("no longer available");
  });

  it("should log, not throw, when acknowledging an unknown command fails", async () => {
    const interaction = makeCommandInteraction("nonexistent");
    interaction.reply = sinon.stub().rejects(new Error("Unknown interaction"));

    await interactionCreateEvent(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    expect(logger.error.calledOnce).toBe(true);
    expect(logger.error.firstCall.args[1]).toContain("unknown command");
  });

  it("should use followUp when interaction already replied and error occurs", async () => {
    executeStub.rejects(new Error("boom"));

    const interaction = makeCommandInteraction("help");
    interaction.replied = true;
    interaction.followUp = sinon.stub().resolves();

    await interactionCreateEvent(mockClient() as never, interaction as never);

    expect(logger.error.called).toBe(true);
    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
    expect((interaction.followUp as sinon.SinonStub).calledOnce).toBe(true);
  });

  it("should use followUp when interaction is deferred and error occurs", async () => {
    executeStub.rejects(new Error("boom"));

    const interaction = makeCommandInteraction("help");
    interaction.deferred = true;
    interaction.followUp = sinon.stub().resolves();

    await interactionCreateEvent(mockClient() as never, interaction as never);

    expect(logger.error.called).toBe(true);
    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
    expect((interaction.followUp as sinon.SinonStub).calledOnce).toBe(true);
  });

  it("should catch handler exceptions and reply with error message", async () => {
    executeStub.rejects(new Error("boom"));

    const interaction = makeCommandInteraction("help");
    await interactionCreateEvent(mockClient() as never, interaction as never);

    expect(logger.error.called).toBe(true);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("error");
  });
});
