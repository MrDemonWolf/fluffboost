import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockClient } from "../../../helpers.js";

describe("admin activity remove command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const db = mockDb();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().returns(true) }));

    const mod = await import("../../../../src/commands/admin/activity/remove.js");

    return { handler: mod.default, logger, db };
  }

  async function loadModuleNotPermitted() {
    const logger = mockLogger();
    const db = mockDb();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().returns(false) }));

    const mod = await import("../../../../src/commands/admin/activity/remove.js");

    return { handler: mod.default, logger, db };
  }

  function makeInteraction(activityId: string) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("activity_id", true).returns(activityId);
    return interaction;
  }

  it("should return early when user is not permitted", async () => {
    const { handler } = await loadModuleNotPermitted();
    const interaction = makeInteraction("a1");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
  });

  it("should reply when empty activity ID provided", async () => {
    const { handler } = await loadModule();
    const interaction = makeInteraction("  ");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("valid activity ID");
  });

  it("should reply when activity not found", async () => {
    const { handler, db } = await loadModule();
    // findUnique equivalent: select().from().where().limit(1) returns empty array -> destructures to undefined
    db.select.returns(mockDbChain([]));

    const interaction = makeInteraction("a-nonexistent");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("No activity found");
  });

  it("should delete activity and reply on success", async () => {
    const { handler, db } = await loadModule();
    // findUnique equivalent returns the activity
    db.select.returns(mockDbChain([{ id: "a1", activity: "Gaming", type: "Playing" }]));

    const interaction = makeInteraction("a1");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(db.delete.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("deleted");
  });

  it("should reply with error on database failure", async () => {
    const { handler, db, logger } = await loadModule();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.select.returns(chain);

    const interaction = makeInteraction("a1");
    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("error occurred");
  });
});
