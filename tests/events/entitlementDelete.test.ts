import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockPosthog, mockEntitlement } from "../helpers.js";

describe("entitlementDeleteEvent", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should update guild isPremium=false for guild-level entitlement", async () => {
    const prisma = mockPrisma();

    const { entitlementDeleteEvent } = await esmock("../../src/events/entitlementDelete.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: mockLogger() },
      "../../src/utils/posthog.js": { default: mockPosthog() },
    });

    await entitlementDeleteEvent(mockEntitlement({ guildId: "g1" }) as never);

    expect(prisma.guild.update.calledOnce).to.be.true;
    expect(prisma.guild.update.firstCall.args[0]).to.deep.equal({
      where: { guildId: "g1" },
      data: { isPremium: false },
    });
  });

  it("should not update DB for user-level entitlement (no guildId)", async () => {
    const prisma = mockPrisma();

    const { entitlementDeleteEvent } = await esmock("../../src/events/entitlementDelete.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: mockLogger() },
      "../../src/utils/posthog.js": { default: mockPosthog() },
    });

    await entitlementDeleteEvent(mockEntitlement({ guildId: null }) as never);
    expect(prisma.guild.update.called).to.be.false;
  });

  it("should capture posthog event", async () => {
    const posthog = mockPosthog();

    const { entitlementDeleteEvent } = await esmock("../../src/events/entitlementDelete.js", {
      "../../src/database/index.js": { prisma: mockPrisma() },
      "../../src/utils/logger.js": { default: mockLogger() },
      "../../src/utils/posthog.js": { default: posthog },
    });

    await entitlementDeleteEvent(mockEntitlement() as never);
    expect(posthog.capture.calledOnce).to.be.true;
    expect(posthog.capture.firstCall.args[0].event).to.equal("premium_deleted");
  });

  it("should handle DB update failure gracefully", async () => {
    const prisma = mockPrisma();
    const logger = mockLogger();
    prisma.guild.update.rejects(new Error("DB error"));

    const { entitlementDeleteEvent } = await esmock("../../src/events/entitlementDelete.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/posthog.js": { default: mockPosthog() },
    });

    await entitlementDeleteEvent(mockEntitlement({ guildId: "g1" }) as never);
    expect(logger.error.calledOnce).to.be.true;
  });
});
