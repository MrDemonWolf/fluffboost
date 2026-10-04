import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockGuild, mockClient } from "../helpers.js";

describe("guildCreateEvent", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should create guild in database and log on join", async () => {
    const db = mockDb();
    const logger = mockLogger();
    const reconcilePremium = sinon.stub().resolves();
    db.insert.returns(mockDbChain([{ guildId: "g1" }]));

    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/premiumReconciliation.js", () => ({ reconcilePremium }));
    const { guildCreateEvent } = await import("../../src/events/guildCreate.js");

    const client = mockClient();
    const guild = mockGuild({ id: "g1", name: "Test Guild", memberCount: 10, client });
    await guildCreateEvent(guild as never);

    expect(db.insert.calledOnce).toBe(true);
    expect(logger.discord.guildJoined.calledOnce).toBe(true);
    expect(reconcilePremium.calledOnceWithExactly(client, "g1")).toBe(true);
  });

  it("should handle database creation failure gracefully", async () => {
    const db = mockDb();
    const logger = mockLogger();
    const reconcilePremium = sinon.stub().resolves();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.insert.returns(chain);

    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/premiumReconciliation.js", () => ({ reconcilePremium }));
    const { guildCreateEvent } = await import("../../src/events/guildCreate.js");

    await guildCreateEvent(mockGuild() as never);
    expect(logger.error.calledOnce).toBe(true);
    expect(reconcilePremium.called).toBe(false);
  });
});
