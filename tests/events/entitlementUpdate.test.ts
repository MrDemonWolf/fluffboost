import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockPosthog, mockEntitlement } from "../helpers.js";

describe("entitlementUpdateEvent", () => {
  afterEach(() => {
    sinon.restore();
  });

  it("should set isPremium=false when endsAt is not null (cancellation)", async () => {
    const prisma = mockPrisma();

    const { entitlementUpdateEvent } = await esmock("../../src/events/entitlementUpdate.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: mockLogger() },
      "../../src/utils/posthog.js": { default: mockPosthog() },
    });

    const cancelled = mockEntitlement({ guildId: "g1", endsAt: new Date("2025-12-31") });
    await entitlementUpdateEvent(null, cancelled as never);

    expect(prisma.guild.update.calledOnce).to.be.true;
    expect(prisma.guild.update.firstCall.args[0].data).to.deep.equal({ isPremium: false });
  });

  it("should set isPremium=true when endsAt is null (renewal)", async () => {
    const prisma = mockPrisma();

    const { entitlementUpdateEvent } = await esmock("../../src/events/entitlementUpdate.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: mockLogger() },
      "../../src/utils/posthog.js": { default: mockPosthog() },
    });

    const renewed = mockEntitlement({ guildId: "g1", endsAt: null });
    await entitlementUpdateEvent(null, renewed as never);

    expect(prisma.guild.update.calledOnce).to.be.true;
    expect(prisma.guild.update.firstCall.args[0].data).to.deep.equal({ isPremium: true });
  });

  it("should not update DB for user-level entitlement (no guildId)", async () => {
    const prisma = mockPrisma();

    const { entitlementUpdateEvent } = await esmock("../../src/events/entitlementUpdate.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: mockLogger() },
      "../../src/utils/posthog.js": { default: mockPosthog() },
    });

    await entitlementUpdateEvent(null, mockEntitlement({ guildId: null }) as never);
    expect(prisma.guild.update.called).to.be.false;
  });

  it("should capture posthog event with cancelled flag", async () => {
    const posthog = mockPosthog();

    const { entitlementUpdateEvent } = await esmock("../../src/events/entitlementUpdate.js", {
      "../../src/database/index.js": { prisma: mockPrisma() },
      "../../src/utils/logger.js": { default: mockLogger() },
      "../../src/utils/posthog.js": { default: posthog },
    });

    const cancelled = mockEntitlement({ endsAt: new Date("2025-12-31") });
    await entitlementUpdateEvent(null, cancelled as never);

    expect(posthog.capture.calledOnce).to.be.true;
    const props = posthog.capture.firstCall.args[0].properties;
    expect(props.cancelled).to.be.true;
  });

  it("should capture posthog event with cancelled=false on renewal", async () => {
    const posthog = mockPosthog();

    const { entitlementUpdateEvent } = await esmock("../../src/events/entitlementUpdate.js", {
      "../../src/database/index.js": { prisma: mockPrisma() },
      "../../src/utils/logger.js": { default: mockLogger() },
      "../../src/utils/posthog.js": { default: posthog },
    });

    await entitlementUpdateEvent(null, mockEntitlement({ endsAt: null }) as never);

    const props = posthog.capture.firstCall.args[0].properties;
    expect(props.cancelled).to.be.false;
  });

  it("should handle DB update failure gracefully", async () => {
    const prisma = mockPrisma();
    const logger = mockLogger();
    prisma.guild.update.rejects(new Error("DB error"));

    const { entitlementUpdateEvent } = await esmock("../../src/events/entitlementUpdate.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/posthog.js": { default: mockPosthog() },
    });

    await entitlementUpdateEvent(null, mockEntitlement({ guildId: "g1" }) as never);
    expect(logger.error.calledOnce).to.be.true;
  });
});
