import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockEnv, mockClient } from "../helpers.js";

describe("setActivity", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: {
    prisma?: ReturnType<typeof mockPrisma>;
    logger?: ReturnType<typeof mockLogger>;
    env?: Record<string, unknown>;
  } = {}) {
    const prisma = overrides.prisma ?? mockPrisma();
    const logger = overrides.logger ?? mockLogger();
    const env = mockEnv(overrides.env ?? {});

    const mod = await esmock("../../src/worker/jobs/setActivity.js", {
      "../../src/database/index.js": { prisma },
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/env.js": { default: env },
    });

    return { setActivity: mod.default, prisma, logger };
  }

  it("should warn and return when client.user is undefined", async () => {
    const logger = mockLogger();
    const { setActivity } = await loadModule({ logger });

    const client = mockClient({ user: undefined });
    await setActivity(client as never);

    expect(logger.warn.calledOnce).to.be.true;
  });

  it("should use default activity when no custom activities in DB", async () => {
    const prisma = mockPrisma();
    prisma.discordActivity.findMany.resolves([]);

    const { setActivity, logger } = await loadModule({ prisma });
    const client = mockClient();
    await setActivity(client as never);

    expect((client.user as { setActivity: sinon.SinonStub }).setActivity.calledOnce).to.be.true;
    expect(logger.warn.calledOnce).to.be.true;
    expect(logger.success.calledOnce).to.be.true;
  });

  it("should select from custom + default activities when available", async () => {
    const prisma = mockPrisma();
    prisma.discordActivity.findMany.resolves([
      { id: "a1", activity: "Custom activity", type: "Playing", url: null, createdAt: new Date() },
    ]);

    const { setActivity } = await loadModule({ prisma });
    const client = mockClient();

    // Run multiple times to cover randomness
    for (let i = 0; i < 5; i++) {
      (client.user as { setActivity: sinon.SinonStub }).setActivity.reset();
      await setActivity(client as never);
      expect((client.user as { setActivity: sinon.SinonStub }).setActivity.calledOnce).to.be.true;
    }
  });

  it("should handle database fetch errors gracefully", async () => {
    const prisma = mockPrisma();
    const logger = mockLogger();
    prisma.discordActivity.findMany.rejects(new Error("DB error"));

    const { setActivity } = await loadModule({ prisma, logger });
    const client = mockClient();

    await setActivity(client as never);
    expect(logger.error.calledOnce).to.be.true;
  });

  it("should use default activity type from env", async () => {
    const prisma = mockPrisma();
    prisma.discordActivity.findMany.resolves([]);

    const { setActivity } = await loadModule({
      prisma,
      env: { DISCORD_DEFAULT_ACTIVITY_TYPE: "Playing", DISCORD_DEFAULT_STATUS: "Test Status" },
    });

    const client = mockClient();
    await setActivity(client as never);

    const setActivityCall = (client.user as { setActivity: sinon.SinonStub }).setActivity.firstCall;
    expect(setActivityCall.args[0]).to.equal("Test Status");
  });
});
