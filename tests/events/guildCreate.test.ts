import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockPosthog, mockGuild } from "../helpers.js";

describe("guildCreateEvent", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should create guild in database and log on join", async () => {
    const prisma = mockPrisma();
    const logger = mockLogger();
    const posthog = mockPosthog();
    prisma.guild.create.resolves({ guildId: "g1" });

    const { guildCreateEvent } = await esmock("../../src/events/guildCreate.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/posthog.js": { default: posthog },
    });

    const guild = mockGuild({ id: "g1", name: "Test Guild", memberCount: 10 });
    await guildCreateEvent(guild as never);

    expect(prisma.guild.create.calledOnce).to.be.true;
    expect(logger.discord.guildJoined.calledOnce).to.be.true;
    expect(posthog.capture.calledOnce).to.be.true;
  });

  it("should capture posthog event with correct properties", async () => {
    const prisma = mockPrisma();
    const posthog = mockPosthog();
    prisma.guild.create.resolves({ guildId: "g1" });

    const { guildCreateEvent } = await esmock("../../src/events/guildCreate.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: mockLogger() },
      "../../src/utils/posthog.js": { default: posthog },
    });

    await guildCreateEvent(mockGuild({ id: "g1" }) as never);
    const captureArgs = posthog.capture.firstCall.args[0];
    expect(captureArgs.distinctId).to.equal("g1");
    expect(captureArgs.event).to.equal("guild created");
  });

  it("should handle database creation failure gracefully", async () => {
    const prisma = mockPrisma();
    const logger = mockLogger();
    prisma.guild.create.rejects(new Error("DB error"));

    const { guildCreateEvent } = await esmock("../../src/events/guildCreate.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/posthog.js": { default: mockPosthog() },
    });

    await guildCreateEvent(mockGuild() as never);
    expect(logger.error.calledOnce).to.be.true;
  });
});
