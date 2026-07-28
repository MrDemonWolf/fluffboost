import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockGuild } from "../helpers.js";

describe("guildCreateEvent", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should create guild in database and log on join", async () => {
    const db = mockDb();
    const logger = mockLogger();
    db.insert.returns(mockDbChain([{ guildId: "g1" }]));

    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const { guildCreateEvent } = await import("../../src/events/guildCreate.js");

    const guild = mockGuild({ id: "g1", name: "Test Guild", memberCount: 10 });
    await guildCreateEvent(guild as never);

    expect(db.insert.calledOnce).toBe(true);
    expect(logger.discord.guildJoined.calledOnce).toBe(true);
  });

  it("should handle database creation failure gracefully", async () => {
    const db = mockDb();
    const logger = mockLogger();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.insert.returns(chain);

    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const { guildCreateEvent } = await import("../../src/events/guildCreate.js");

    await guildCreateEvent(mockGuild() as never);
    expect(logger.error.calledOnce).toBe(true);
  });
});
