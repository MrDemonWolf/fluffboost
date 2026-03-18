import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockPosthog, mockGuild } from "../helpers.js";

describe("guildDeleteEvent", () => {
  afterEach(() => {
    sinon.restore();
    mock.restore();
  });

  it("should delete guild from database and log on leave", async () => {
    const db = mockDb();
    const logger = mockLogger();
    const posthog = mockPosthog();

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/posthog.js", () => ({ default: posthog }));
    const { guildDeleteEvent } = await import("../../src/events/guildDelete.js");

    await guildDeleteEvent(mockGuild({ id: "g1", name: "Bye Guild" }) as never);

    expect(db.delete.calledOnce).toBe(true);
    expect(logger.discord.guildLeft.calledOnce).toBe(true);
    expect(posthog.capture.calledOnce).toBe(true);
  });

  it("should capture posthog event with correct properties", async () => {
    const db = mockDb();
    const posthog = mockPosthog();

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    mock.module("../../src/utils/posthog.js", () => ({ default: posthog }));
    const { guildDeleteEvent } = await import("../../src/events/guildDelete.js");

    await guildDeleteEvent(mockGuild({ id: "g1" }) as never);
    const captureArgs = posthog.capture.firstCall.args[0];
    expect(captureArgs.distinctId).toBe("g1");
    expect(captureArgs.event).toBe("guild left");
  });

  it("should handle database deletion failure gracefully", async () => {
    const db = mockDb();
    const logger = mockLogger();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.delete.returns(chain);

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/posthog.js", () => ({ default: mockPosthog() }));
    const { guildDeleteEvent } = await import("../../src/events/guildDelete.js");

    await guildDeleteEvent(mockGuild() as never);
    expect(logger.error.calledOnce).toBe(true);
  });
});
