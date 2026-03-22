import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockGuild } from "../helpers.js";

describe("guildDeleteEvent", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should delete guild from database and log on leave", async () => {
    const db = mockDb();
    const logger = mockLogger();

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const { guildDeleteEvent } = await import("../../src/events/guildDelete.js");

    await guildDeleteEvent(mockGuild({ id: "g1", name: "Bye Guild" }) as never);

    expect(db.delete.calledOnce).toBe(true);
    expect(logger.discord.guildLeft.calledOnce).toBe(true);
  });

  it("should handle database deletion failure gracefully", async () => {
    const db = mockDb();
    const logger = mockLogger();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.delete.returns(chain);

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const { guildDeleteEvent } = await import("../../src/events/guildDelete.js");

    await guildDeleteEvent(mockGuild() as never);
    expect(logger.error.calledOnce).toBe(true);
  });
});
