import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockClient, mockInteraction } from "../../helpers.js";

describe("setup channel command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const db = mockDb();

    mock.module("../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../../src/utils/guildDatabase.js", () => ({
      guildExists: sinon.stub().resolves(true),
      pruneGuilds: sinon.stub().resolves(),
      ensureGuildExists: sinon.stub().resolves(),
    }));

    const mod = await import("../../../src/commands/setup/channel.js");

    return { handler: mod.default, logger, db };
  }

  it("should return early when no guildId", async () => {
    const { handler } = await loadModule();
    const interaction = mockInteraction({ guildId: null });

    await handler(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
  });

  it("should update guild with channel and reply", async () => {
    const { handler, db } = await loadModule();
    const interaction = mockInteraction();
    const channel = { id: "ch-123", name: "general" };
    (interaction.options.getChannel as sinon.SinonStub).withArgs("channel", true).returns(channel);

    const chain = mockDbChain([]);
    db.update.returns(chain);

    await handler(mockClient() as never, interaction as never);

    expect(db.update.calledOnce).toBe(true);
    expect((chain.set as sinon.SinonStub).calledOnce).toBe(true);
    const setArgs = (chain.set as sinon.SinonStub).firstCall.args[0];
    expect(setArgs.motivationChannelId).toBe("ch-123");
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
  });

  it("should reply with error on failure", async () => {
    const { handler, db, logger } = await loadModule();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.update.returns(chain);
    const interaction = mockInteraction();
    (interaction.options.getChannel as sinon.SinonStub).withArgs("channel", true).returns({ id: "ch-123" });

    await handler(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
  });
});
