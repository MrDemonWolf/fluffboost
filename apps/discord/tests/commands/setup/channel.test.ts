import { describe, it, expect, afterEach, mock } from "bun:test";
import { ChannelType, MessageFlags } from "discord.js";
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

  function adminInteraction(overrides: Record<string, unknown> = {}) {
    return mockInteraction({ memberPermissions: { has: sinon.stub().returns(true) }, ...overrides });
  }

  function textChannel(id: string, guildId: unknown, canSend = true) {
    return { id, guildId, type: ChannelType.GuildText, permissionsFor: () => ({ has: () => canSend }) };
  }

  it("should reply ephemerally when no guildId", async () => {
    const { handler } = await loadModule();
    const interaction = adminInteraction({ guildId: null });

    await handler(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg.content).toContain("only be used in a server");
    expect(arg.flags).toBe(MessageFlags.Ephemeral);
  });

  it("refuses non-administrators without fetching the channel or writing", async () => {
    const { handler, db } = await loadModule();
    const interaction = mockInteraction({ memberPermissions: { has: sinon.stub().returns(false) } });
    const client = mockClient();

    await handler(client as never, interaction as never);

    expect(client.channels.fetch.called).toBe(false);
    expect(db.update.called).toBe(false);
    const arg = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(arg.content).toContain("Administrator");
    expect(arg.flags).toBe(MessageFlags.Ephemeral);
  });

  it("should update guild with channel and reply", async () => {
    const { handler, db } = await loadModule();
    const interaction = adminInteraction();
    (interaction.options.getChannel as sinon.SinonStub).withArgs("channel", true).returns({ id: "ch-123" });

    const chain = mockDbChain([]);
    db.update.returns(chain);

    const client = mockClient();
    client.channels.fetch.resolves(textChannel("ch-123", interaction.guildId));
    await handler(client as never, interaction as never);

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
    const interaction = adminInteraction();
    (interaction.options.getChannel as sinon.SinonStub).withArgs("channel", true).returns({ id: "ch-123" });

    const client = mockClient();
    client.channels.fetch.resolves(textChannel("ch-123", interaction.guildId));
    await handler(client as never, interaction as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
  });

  it("rejects an inaccessible channel without saving it", async () => {
    const { handler, db } = await loadModule();
    const interaction = adminInteraction();
    interaction.options.getChannel.returns({ id: "restricted" });
    const client = mockClient();
    client.channels.fetch.resolves(textChannel("restricted", interaction.guildId, false));
    await handler(client as never, interaction as never);
    expect(db.update.called).toBe(false);
    expect(interaction.reply.firstCall.args[0].content).toContain("Embed Links");
  });

  it("gives the permission guidance for a non-text channel instead of a generic error", async () => {
    const { handler, db, logger } = await loadModule();
    const interaction = adminInteraction();
    interaction.options.getChannel.returns({ id: "voice-1" });
    const client = mockClient();
    // A voice channel has no text permissionsFor contract here; it must be
    // rejected on its type before anything else is called on it.
    client.channels.fetch.resolves({ id: "voice-1", guildId: interaction.guildId, type: ChannelType.GuildVoice });

    await handler(client as never, interaction as never);

    expect(db.update.called).toBe(false);
    expect(logger.commands.error.called).toBe(false);
    expect(interaction.reply.firstCall.args[0].content).toContain("Embed Links");
  });
});
