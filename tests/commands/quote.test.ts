import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockClient, mockInteraction } from "../helpers.js";

describe("quote command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const db = mockDb();

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/database/index.js", () => ({ db }));

    const mod = await import("../../src/commands/quote.js");

    return { execute: mod.execute, logger, db };
  }

  it("should reply when no quotes found", async () => {
    const { execute, db } = await loadModule();
    // First select: count query returns 0
    db.select.onCall(0).returns(mockDbChain([{ value: 0 }]));
    // Second select: findMany returns empty
    db.select.onCall(1).returns(mockDbChain([]));

    const interaction = mockInteraction();
    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg).toContain("No motivation quote found");
  });

  it("should reply with quote embed", async () => {
    const { execute, db } = await loadModule();
    db.select.onCall(0).returns(mockDbChain([{ value: 1 }]));
    db.select.onCall(1).returns(mockDbChain([
      { id: "q1", quote: "Be brave", author: "Anon", addedBy: "user-1", createdAt: new Date() },
    ]));

    const client = mockClient();
    const interaction = mockInteraction();
    await execute(client as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(Array.isArray(replyArgs.embeds)).toBe(true);
    expect(replyArgs.embeds).toHaveLength(1);
  });

  it("should reply with error on failure", async () => {
    const { execute, db, logger } = await loadModule();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.select.returns(chain);

    const interaction = mockInteraction();
    await execute(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
  });
});
