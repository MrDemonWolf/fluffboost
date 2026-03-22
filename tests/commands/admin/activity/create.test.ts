import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockClient } from "../../../helpers.js";

describe("admin activity create command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const db = mockDb();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().resolves(true) }));

    const mod = await import("../../../../src/commands/admin/activity/create.js");

    return { handler: mod.default, logger, db };
  }

  async function loadModuleNotPermitted() {
    const logger = mockLogger();
    const db = mockDb();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().resolves(false) }));

    const mod = await import("../../../../src/commands/admin/activity/create.js");

    return { handler: mod.default, logger, db };
  }

  function makeInteraction(activity: string, type: string, url: string | null = null) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("activity", true).returns(activity);
    getStringStub.withArgs("type", true).returns(type);
    getStringStub.withArgs("url").returns(url);
    return interaction;
  }

  it("should return early when user is not permitted", async () => {
    const { handler } = await loadModuleNotPermitted();
    const interaction = makeInteraction("Gaming", "Playing");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
  });

  it("should reply when empty activity provided", async () => {
    const { handler } = await loadModule();
    const interaction = makeInteraction("  ", "Playing");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("provide an activity");
  });

  it("should reply when empty type provided", async () => {
    const { handler } = await loadModule();
    const interaction = makeInteraction("Gaming", "  ");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("provide a type");
  });

  it("should create activity and reply on success", async () => {
    const { handler, db } = await loadModule();
    db.insert.returns(mockDbChain([{ id: "a1", activity: "Gaming", type: "Playing", url: null }]));

    const interaction = makeInteraction("Gaming", "Playing");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(db.insert.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Activity added");
  });

  it("should create activity with url when provided", async () => {
    const { handler, db } = await loadModule();
    const chain = mockDbChain([{
      id: "a1",
      activity: "Streaming",
      type: "Streaming",
      url: "https://twitch.tv/test",
    }]);
    db.insert.returns(chain);

    const interaction = makeInteraction("Streaming", "Streaming", "https://twitch.tv/test");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(db.insert.calledOnce).toBe(true);
    const valuesArgs = (chain.values as sinon.SinonStub).firstCall.args[0];
    expect(valuesArgs.url).toBe("https://twitch.tv/test");
  });

  it("should reply with error on database failure", async () => {
    const { handler, db, logger } = await loadModule();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.insert.returns(chain);

    const interaction = makeInteraction("Gaming", "Playing");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("error occurred");
  });
});
