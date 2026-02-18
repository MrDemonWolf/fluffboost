import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockPosthog, mockGuild } from "../helpers.js";

describe("guildDeleteEvent", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should delete guild from database and log on leave", async () => {
    const prisma = mockPrisma();
    const logger = mockLogger();
    const posthog = mockPosthog();

    const { guildDeleteEvent } = await esmock("../../src/events/guildDelete.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/posthog.js": { default: posthog },
    });

    await guildDeleteEvent(mockGuild({ id: "g1", name: "Bye Guild" }) as never);

    expect(prisma.guild.delete.calledOnce).to.be.true;
    expect(prisma.guild.delete.firstCall.args[0]).to.deep.equal({ where: { guildId: "g1" } });
    expect(logger.discord.guildLeft.calledOnce).to.be.true;
    expect(posthog.capture.calledOnce).to.be.true;
  });

  it("should capture posthog event with correct properties", async () => {
    const prisma = mockPrisma();
    const posthog = mockPosthog();

    const { guildDeleteEvent } = await esmock("../../src/events/guildDelete.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: mockLogger() },
      "../../src/utils/posthog.js": { default: posthog },
    });

    await guildDeleteEvent(mockGuild({ id: "g1" }) as never);
    const captureArgs = posthog.capture.firstCall.args[0];
    expect(captureArgs.distinctId).to.equal("g1");
    expect(captureArgs.event).to.equal("guild left");
  });

  it("should handle database deletion failure gracefully", async () => {
    const prisma = mockPrisma();
    const logger = mockLogger();
    prisma.guild.delete.rejects(new Error("DB error"));

    const { guildDeleteEvent } = await esmock("../../src/events/guildDelete.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/posthog.js": { default: mockPosthog() },
    });

    await guildDeleteEvent(mockGuild() as never);
    expect(logger.error.calledOnce).to.be.true;
  });
});
