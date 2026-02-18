import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockPosthog, mockClient } from "../helpers.js";

describe("sendMotivation", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: {
    prisma?: ReturnType<typeof mockPrisma>;
    logger?: ReturnType<typeof mockLogger>;
    posthog?: ReturnType<typeof mockPosthog>;
    isGuildDueForMotivation?: sinon.SinonStub;
  } = {}) {
    const prisma = overrides.prisma ?? mockPrisma();
    const logger = overrides.logger ?? mockLogger();
    const posthog = overrides.posthog ?? mockPosthog();
    const isGuildDueStub = overrides.isGuildDueForMotivation ?? sinon.stub().returns(true);

    const mod = await esmock("../../src/worker/jobs/sendMotivation.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/posthog.js": { default: posthog },
      "../../src/utils/scheduleEvaluator.js": { isGuildDueForMotivation: isGuildDueStub },
    });

    return { sendMotivation: mod.default, prisma, logger, posthog, isGuildDueStub };
  }

  it("should return early when no guilds have channels configured", async () => {
    const prisma = mockPrisma();
    prisma.guild.findMany.resolves([]);
    const { sendMotivation, logger } = await loadModule({ prisma });

    await sendMotivation(mockClient() as never);
    expect(prisma.motivationQuote.count.called).to.be.false;
  });

  it("should return early when no guilds are due", async () => {
    const prisma = mockPrisma();
    prisma.guild.findMany.resolves([{ guildId: "g1", motivationChannelId: "ch1" }]);
    const isGuildDueStub = sinon.stub().returns(false);

    const { sendMotivation } = await loadModule({ prisma, isGuildDueForMotivation: isGuildDueStub });
    await sendMotivation(mockClient() as never);
    expect(prisma.motivationQuote.count.called).to.be.false;
  });

  it("should return early when no quotes exist in database", async () => {
    const prisma = mockPrisma();
    prisma.guild.findMany.resolves([{ guildId: "g1", motivationChannelId: "ch1" }]);
    prisma.motivationQuote.count.resolves(0);
    prisma.motivationQuote.findMany.resolves([]);

    const { sendMotivation, logger } = await loadModule({ prisma });
    await sendMotivation(mockClient() as never);
    expect(logger.error.called).to.be.true;
  });

  it("should send embed to due guilds and update lastMotivationSentAt", async () => {
    const prisma = mockPrisma();
    prisma.guild.findMany.resolves([{ guildId: "g1", motivationChannelId: "ch1" }]);
    prisma.motivationQuote.count.resolves(1);
    prisma.motivationQuote.findMany.resolves([{ id: "q1", quote: "Stay strong", author: "Author", addedBy: "u1" }]);

    const sendStub = sinon.stub().resolves();
    const channel = {
      isTextBased: () => true,
      isDMBased: () => false,
      send: sendStub,
    };

    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const { sendMotivation, posthog } = await loadModule({ prisma });
    await sendMotivation(client as never);

    expect(sendStub.calledOnce).to.be.true;
    expect(prisma.guild.update.calledOnce).to.be.true;
    expect(posthog.capture.calledOnce).to.be.true;
  });

  it("should skip guilds with invalid channels (not text-based)", async () => {
    const prisma = mockPrisma();
    prisma.guild.findMany.resolves([{ guildId: "g1", motivationChannelId: "ch1" }]);
    prisma.motivationQuote.count.resolves(1);
    prisma.motivationQuote.findMany.resolves([{ id: "q1", quote: "Stay", author: "A", addedBy: "u1" }]);

    const channel = {
      isTextBased: () => false,
      isDMBased: () => false,
      send: sinon.stub(),
    };

    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const { sendMotivation, logger } = await loadModule({ prisma });
    await sendMotivation(client as never);

    expect(channel.send.called).to.be.false;
    expect(logger.warn.called).to.be.true;
  });

  it("should skip guilds with DM-based channels", async () => {
    const prisma = mockPrisma();
    prisma.guild.findMany.resolves([{ guildId: "g1", motivationChannelId: "ch1" }]);
    prisma.motivationQuote.count.resolves(1);
    prisma.motivationQuote.findMany.resolves([{ id: "q1", quote: "Stay", author: "A", addedBy: "u1" }]);

    const channel = {
      isTextBased: () => true,
      isDMBased: () => true,
      send: sinon.stub(),
    };

    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const { sendMotivation } = await loadModule({ prisma });
    await sendMotivation(client as never);

    expect(channel.send.called).to.be.false;
  });

  it("should handle per-guild send failures via Promise.allSettled", async () => {
    const prisma = mockPrisma();
    prisma.guild.findMany.resolves([
      { guildId: "g1", motivationChannelId: "ch1" },
      { guildId: "g2", motivationChannelId: "ch2" },
    ]);
    prisma.motivationQuote.count.resolves(1);
    prisma.motivationQuote.findMany.resolves([{ id: "q1", quote: "Stay", author: "A", addedBy: "u1" }]);

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

    const { sendMotivation, logger } = await loadModule({ prisma });
    await sendMotivation(client as never);

    // Should not throw, both guilds attempted
    expect(logger.error.called).to.be.true;
  });

  it("should capture posthog event with sent/failed stats", async () => {
    const prisma = mockPrisma();
    prisma.guild.findMany.resolves([{ guildId: "g1", motivationChannelId: "ch1" }]);
    prisma.motivationQuote.count.resolves(1);
    prisma.motivationQuote.findMany.resolves([{ id: "q1", quote: "Stay", author: "A", addedBy: "u1" }]);

    const channel = { isTextBased: () => true, isDMBased: () => false, send: sinon.stub().resolves() };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const posthog = mockPosthog();
    const { sendMotivation } = await loadModule({ prisma, posthog });
    await sendMotivation(client as never);

    const captureArgs = posthog.capture.firstCall.args[0];
    expect(captureArgs.event).to.equal("motivation job executed");
    expect(captureArgs.properties).to.have.property("sent");
    expect(captureArgs.properties).to.have.property("failed");
  });

  it("should handle user fetch failure for addedBy gracefully", async () => {
    const prisma = mockPrisma();
    prisma.guild.findMany.resolves([{ guildId: "g1", motivationChannelId: "ch1" }]);
    prisma.motivationQuote.count.resolves(1);
    prisma.motivationQuote.findMany.resolves([{ id: "q1", quote: "Stay", author: "A", addedBy: "u-missing" }]);

    const channel = { isTextBased: () => true, isDMBased: () => false, send: sinon.stub().resolves() };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);
    (client.users.fetch as sinon.SinonStub).rejects(new Error("Unknown User"));

    const { sendMotivation } = await loadModule({ prisma });
    await sendMotivation(client as never);

    // Should still send the embed even if user fetch fails
    expect(channel.send.calledOnce).to.be.true;
  });
});
