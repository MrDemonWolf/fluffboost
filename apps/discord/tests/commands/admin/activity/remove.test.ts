import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockPermissions } from "../../permissionsMock.js";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockClient } from "../../../helpers.js";

const ACTIVITY_ID = "0b1c2d3e-4f5a-4b6c-9d7e-8f9a0b1c2d3e";

describe("admin activity remove command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(permitted = true) {
    const logger = mockLogger();
    const db = mockDb();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    await mockPermissions(permitted);

    const mod = await import("../../../../src/commands/admin/activity/remove.js");

    return { handler: mod.default, logger, db };
  }

  function makeInteraction(activityId: string) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("activity_id", true).returns(activityId);
    return interaction;
  }

  it("should return early without touching the database when user is not permitted", async () => {
    const { handler, db } = await loadModule(false);
    const interaction = makeInteraction(ACTIVITY_ID);

    await handler(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
    expect(db.select.called).toBe(false);
    expect(db.delete.called).toBe(false);
  });

  it("replies not found for a blank ID without querying the database", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction("  ");

    await handler(mockClient() as never, interaction as never);

    expect(db.delete.called).toBe(false);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("No activity found");
  });

  it("replies not found for a malformed ID without querying the database", async () => {
    const { handler, db, logger } = await loadModule();
    const interaction = makeInteraction(ACTIVITY_ID.slice(0, 35));

    await handler(mockClient() as never, interaction as never);

    expect(db.delete.called).toBe(false);
    expect(logger.commands.error.called).toBe(false);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("No activity found");
  });

  it("should reply when activity not found", async () => {
    const { handler, db } = await loadModule();
    db.delete.returns(mockDbChain([]));

    const interaction = makeInteraction(ACTIVITY_ID);
    await handler(mockClient() as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("No activity found");
  });

  it("should delete activity atomically and reply on success", async () => {
    const { handler, db } = await loadModule();
    const chain = mockDbChain([{ id: ACTIVITY_ID }]);
    db.delete.returns(chain);

    const interaction = makeInteraction(ACTIVITY_ID);
    await handler(mockClient() as never, interaction as never);

    expect(db.select.called).toBe(false);
    expect(db.delete.calledOnce).toBe(true);
    expect((chain["returning"] as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("deleted");
  });

  it("should reply with error on database failure", async () => {
    const { handler, db, logger } = await loadModule();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.delete.returns(chain);

    const interaction = makeInteraction(ACTIVITY_ID);
    await handler(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("error occurred");
  });
});
