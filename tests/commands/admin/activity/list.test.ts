import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockClient } from "../../../helpers.js";

describe("admin activity list command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const db = mockDb();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().resolves(true) }));

    const mod = await import("../../../../src/commands/admin/activity/list.js");

    return { handler: mod.default, logger, db };
  }

  async function loadModuleNotPermitted() {
    const logger = mockLogger();
    const db = mockDb();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().resolves(false) }));

    const mod = await import("../../../../src/commands/admin/activity/list.js");

    return { handler: mod.default, logger, db };
  }

  it("should return early when user is not permitted", async () => {
    const { handler } = await loadModuleNotPermitted();
    const interaction = mockInteraction();

    await handler(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
  });

  it("should reply when no activities found", async () => {
    const { handler, db } = await loadModule();
    db.select.returns(mockDbChain([]));

    const interaction = mockInteraction();
    await handler(mockClient() as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("No activities found");
  });

  it("should reply with activities file when activities exist", async () => {
    const { handler, db } = await loadModule();
    db.select.returns(mockDbChain([
      { id: "a1", activity: "Gaming", type: "Playing", url: null, createdAt: new Date() },
      { id: "a2", activity: "Streaming", type: "Streaming", url: "https://twitch.tv/test", createdAt: new Date() },
    ]));

    const interaction = mockInteraction();
    await handler(mockClient() as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(Array.isArray(replyArgs.files)).toBe(true);
    expect(replyArgs.files).toHaveLength(1);
    expect(replyArgs.files[0].name).toBe("activities.txt");
  });

  it("should reply with error on database failure", async () => {
    const { handler, db, logger } = await loadModule();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.select.returns(chain);

    const interaction = mockInteraction();
    await handler(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("error occurred");
  });
});
