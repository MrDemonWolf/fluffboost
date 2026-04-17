import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockClient, mockInteraction } from "../helpers.js";

describe("quote command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: {
    quote?: unknown;
    author?: unknown;
  } = {}) {
    const logger = mockLogger();
    const randomStub = sinon.stub().resolves(overrides.quote ?? null);
    const authorStub = sinon.stub().resolves(overrides.author ?? null);

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/quoteHelpers.js", () => ({
      getRandomMotivationQuote: randomStub,
      resolveQuoteAuthor: authorStub,
      buildMotivationEmbed: () => ({ fake: true }),
    }));

    const mod = await import("../../src/commands/quote.js");
    return { execute: mod.execute, logger, randomStub, authorStub };
  }

  it("should reply when no quotes found", async () => {
    const { execute } = await loadModule();
    const interaction = mockInteraction();
    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg).toContain("No motivation quote found");
  });

  it("should reply with embed when a quote is found", async () => {
    const { execute } = await loadModule({
      quote: { id: "q1", quote: "Be brave", author: "Anon", addedBy: "u1", createdAt: new Date() },
      author: { username: "u", displayAvatarURL: () => "x" },
    });
    const interaction = mockInteraction();
    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(Array.isArray(replyArgs.embeds)).toBe(true);
  });

  it("should reply with error on failure", async () => {
    const { execute, logger, randomStub } = await loadModule();
    randomStub.rejects(new Error("DB error"));

    const interaction = mockInteraction();
    await execute(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
  });
});
