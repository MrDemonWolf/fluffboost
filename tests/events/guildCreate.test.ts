import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockPosthog, mockGuild } from "../helpers.js";

describe("guildCreateEvent", () => {
  afterEach(() => {
    sinon.restore();
    mock.restore();
  });

  it("should create guild in database and log on join", async () => {
    const db = mockDb();
    const logger = mockLogger();
    const posthog = mockPosthog();
    db.insert.returns(mockDbChain([{ guildId: "g1" }]));

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/posthog.js", () => ({ default: posthog }));
    const { guildCreateEvent } = await import("../../src/events/guildCreate.js");

    const guild = mockGuild({ id: "g1", name: "Test Guild", memberCount: 10 });
    await guildCreateEvent(guild as never);

    expect(db.insert.calledOnce).toBe(true);
    expect(logger.discord.guildJoined.calledOnce).toBe(true);
    expect(posthog.capture.calledOnce).toBe(true);
  });

  it("should capture posthog event with correct properties", async () => {
    const db = mockDb();
    const posthog = mockPosthog();
    db.insert.returns(mockDbChain([{ guildId: "g1" }]));

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
    mock.module("../../src/utils/posthog.js", () => ({ default: posthog }));
    const { guildCreateEvent } = await import("../../src/events/guildCreate.js");

    await guildCreateEvent(mockGuild({ id: "g1" }) as never);
    const captureArgs = posthog.capture.firstCall.args[0];
    expect(captureArgs.distinctId).toBe("g1");
    expect(captureArgs.event).toBe("guild created");
  });

  it("should handle database creation failure gracefully", async () => {
    const db = mockDb();
    const logger = mockLogger();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.insert.returns(chain);

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/posthog.js", () => ({ default: mockPosthog() }));
    const { guildCreateEvent } = await import("../../src/events/guildCreate.js");

    await guildCreateEvent(mockGuild() as never);
    expect(logger.error.calledOnce).toBe(true);
  });
});
