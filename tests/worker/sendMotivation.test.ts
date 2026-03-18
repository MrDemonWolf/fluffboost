import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockPosthog, mockClient } from "../helpers.js";

describe("sendMotivation", () => {
  afterEach(() => {
    sinon.restore();
    mock.restore();
  });

  async function loadModule(overrides: {
    db?: ReturnType<typeof mockDb>;
    logger?: ReturnType<typeof mockLogger>;
    posthog?: ReturnType<typeof mockPosthog>;
    isGuildDueForMotivation?: sinon.SinonStub;
  } = {}) {
    const db = overrides.db ?? mockDb();
    const logger = overrides.logger ?? mockLogger();
    const posthog = overrides.posthog ?? mockPosthog();
    const isGuildDueStub = overrides.isGuildDueForMotivation ?? sinon.stub().returns(true);

    mock.module("../../src/database/index.js", () => ({ db }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/posthog.js", () => ({ default: posthog }));
    mock.module("../../src/utils/scheduleEvaluator.js", () => ({ isGuildDueForMotivation: isGuildDueStub }));

    const mod = await import("../../src/worker/jobs/sendMotivation.js");

    return { sendMotivation: mod.default, db, logger, posthog, isGuildDueStub };
  }

  it("should return early when no guilds have channels configured", async () => {
    const db = mockDb();
    db.select.onCall(0).returns(mockDbChain([]));
    const { sendMotivation } = await loadModule({ db });

    await sendMotivation(mockClient() as never);
    // Count query (second select) should not be called since no guilds found
    expect(db.select.callCount).toBe(1);
  });

  it("should return early when no guilds are due", async () => {
    const db = mockDb();
    db.select.onCall(0).returns(mockDbChain([{ guildId: "g1", motivationChannelId: "ch1" }]));
    const isGuildDueStub = sinon.stub().returns(false);

    const { sendMotivation } = await loadModule({ db, isGuildDueForMotivation: isGuildDueStub });
    await sendMotivation(mockClient() as never);
    // Count query (second select) should not be called since no guilds are due
    expect(db.select.callCount).toBe(1);
  });

  it("should return early when no quotes exist in database", async () => {
    const db = mockDb();
    db.select.onCall(0).returns(mockDbChain([{ guildId: "g1", motivationChannelId: "ch1" }]));
    db.select.onCall(1).returns(mockDbChain([{ value: 0 }]));
    db.select.onCall(2).returns(mockDbChain([]));

    const { sendMotivation, logger } = await loadModule({ db });
    await sendMotivation(mockClient() as never);
    expect(logger.error.called).toBe(true);
  });

  it("should send embed to due guilds and update lastMotivationSentAt", async () => {
    const db = mockDb();
    db.select.onCall(0).returns(mockDbChain([{ guildId: "g1", motivationChannelId: "ch1" }]));
    db.select.onCall(1).returns(mockDbChain([{ value: 1 }]));
    db.select.onCall(2).returns(mockDbChain([{ id: "q1", quote: "Stay strong", author: "Author", addedBy: "u1" }]));

    const sendStub = sinon.stub().resolves();
    const channel = {
      isTextBased: () => true,
      isDMBased: () => false,
      send: sendStub,
    };

    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const { sendMotivation, posthog } = await loadModule({ db });
    await sendMotivation(client as never);

    expect(sendStub.calledOnce).toBe(true);
    expect(db.update.calledOnce).toBe(true);
    expect(posthog.capture.calledOnce).toBe(true);
  });

  it("should skip guilds with invalid channels (not text-based)", async () => {
    const db = mockDb();
    db.select.onCall(0).returns(mockDbChain([{ guildId: "g1", motivationChannelId: "ch1" }]));
    db.select.onCall(1).returns(mockDbChain([{ value: 1 }]));
    db.select.onCall(2).returns(mockDbChain([{ id: "q1", quote: "Stay", author: "A", addedBy: "u1" }]));

    const channel = {
      isTextBased: () => false,
      isDMBased: () => false,
      send: sinon.stub(),
    };

    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const { sendMotivation, logger } = await loadModule({ db });
    await sendMotivation(client as never);

    expect(channel.send.called).toBe(false);
    expect(logger.warn.called).toBe(true);
  });

  it("should skip guilds with DM-based channels", async () => {
    const db = mockDb();
    db.select.onCall(0).returns(mockDbChain([{ guildId: "g1", motivationChannelId: "ch1" }]));
    db.select.onCall(1).returns(mockDbChain([{ value: 1 }]));
    db.select.onCall(2).returns(mockDbChain([{ id: "q1", quote: "Stay", author: "A", addedBy: "u1" }]));

    const channel = {
      isTextBased: () => true,
      isDMBased: () => true,
      send: sinon.stub(),
    };

    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const { sendMotivation } = await loadModule({ db });
    await sendMotivation(client as never);

    expect(channel.send.called).toBe(false);
  });

  it("should handle per-guild send failures via Promise.allSettled", async () => {
    const db = mockDb();
    db.select.onCall(0).returns(mockDbChain([
      { guildId: "g1", motivationChannelId: "ch1" },
      { guildId: "g2", motivationChannelId: "ch2" },
    ]));
    db.select.onCall(1).returns(mockDbChain([{ value: 1 }]));
    db.select.onCall(2).returns(mockDbChain([{ id: "q1", quote: "Stay", author: "A", addedBy: "u1" }]));

    const sendStub = sinon.stub();
    sendStub.onFirstCall().rejects(new Error("channel error"));
    sendStub.onSecondCall().resolves();

    const channel = {
      isTextBased: () => true,
      isDMBased: () => false,
      send: sendStub,
    };

    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const { sendMotivation, logger } = await loadModule({ db });
    await sendMotivation(client as never);

    // Should not throw, both guilds attempted
    expect(logger.error.called).toBe(true);
  });

  it("should capture posthog event with sent/failed stats", async () => {
    const db = mockDb();
    db.select.onCall(0).returns(mockDbChain([{ guildId: "g1", motivationChannelId: "ch1" }]));
    db.select.onCall(1).returns(mockDbChain([{ value: 1 }]));
    db.select.onCall(2).returns(mockDbChain([{ id: "q1", quote: "Stay", author: "A", addedBy: "u1" }]));

    const channel = { isTextBased: () => true, isDMBased: () => false, send: sinon.stub().resolves() };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const posthog = mockPosthog();
    const { sendMotivation } = await loadModule({ db, posthog });
    await sendMotivation(client as never);

    const captureArgs = posthog.capture.firstCall.args[0];
    expect(captureArgs.event).toBe("motivation job executed");
    expect(captureArgs.properties).toHaveProperty("sent");
    expect(captureArgs.properties).toHaveProperty("failed");
  });

  it("should handle user fetch failure for addedBy gracefully", async () => {
    const db = mockDb();
    db.select.onCall(0).returns(mockDbChain([{ guildId: "g1", motivationChannelId: "ch1" }]));
    db.select.onCall(1).returns(mockDbChain([{ value: 1 }]));
    db.select.onCall(2).returns(mockDbChain([{ id: "q1", quote: "Stay", author: "A", addedBy: "u-missing" }]));

    const channel = { isTextBased: () => true, isDMBased: () => false, send: sinon.stub().resolves() };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);
    (client.users.fetch as sinon.SinonStub).rejects(new Error("Unknown User"));

    const { sendMotivation } = await loadModule({ db });
    await sendMotivation(client as never);

    // Should still send the embed even if user fetch fails
    expect(channel.send.calledOnce).toBe(true);
  });
});
