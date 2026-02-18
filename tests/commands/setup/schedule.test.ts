import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPrisma, mockInteraction } from "../../helpers.js";

describe("setup schedule command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: { premiumEnabled?: boolean; hasEntitlement?: boolean } = {}) {
    const logger = mockLogger();
    const prisma = mockPrisma();

    const mod = await esmock("../../../src/commands/setup/schedule.js", {
      "../../../src/utils/logger.js": { default: logger },
      "../../../src/database/index.js": { prisma },
      "../../../src/utils/premium.js": {
        isPremiumEnabled: sinon.stub().returns(overrides.premiumEnabled ?? false),
        hasEntitlement: sinon.stub().returns(overrides.hasEntitlement ?? false),
        getPremiumSkuId: sinon.stub().returns("sku-1"),
      },
      "../../../src/utils/guildDatabase.js": { guildExists: sinon.stub().resolves(true) },
      "../../../src/utils/timezones.js": {
        isValidTimezone: sinon.stub().callsFake((tz: string) => {
          return ["America/Chicago", "America/New_York", "Europe/London", "UTC"].includes(tz);
        }),
        filterTimezones: sinon.stub().returns([]),
      },
    });

    return { schedule: mod.default, logger, prisma };
  }

  function makeScheduleInteraction(opts: {
    frequency?: string;
    time?: string;
    timezone?: string;
    day?: number | null;
    guildId?: string | null;
  } = {}) {
    const interaction = mockInteraction({ guildId: "guildId" in opts ? opts.guildId : "guild-123" });
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    const getIntegerStub = interaction.options.getInteger as sinon.SinonStub;

    getStringStub.withArgs("frequency").returns(opts.frequency ?? null);
    getStringStub.withArgs("time").returns(opts.time ?? null);
    getStringStub.withArgs("timezone").returns(opts.timezone ?? null);
    getIntegerStub.withArgs("day").returns(opts.day ?? null);

    return interaction;
  }

  it("should show premium upsell when premium enabled and no entitlement", async () => {
    const { schedule } = await loadModule({ premiumEnabled: true, hasEntitlement: false });
    const interaction = makeScheduleInteraction();

    await schedule(localMockClient(), interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.embeds[0].data.title).to.equal("Premium Feature");
  });

  it("should update guild with valid daily schedule", async () => {
    const { schedule, prisma } = await loadModule({ premiumEnabled: false });
    const interaction = makeScheduleInteraction({ frequency: "Daily", time: "09:00", timezone: "America/Chicago" });

    await schedule(localMockClient(), interaction as never);

    expect(prisma.guild.update.calledOnce).to.be.true;
    const updateArgs = prisma.guild.update.firstCall.args[0];
    expect(updateArgs.data.motivationFrequency).to.equal("Daily");
    expect(updateArgs.data.motivationTime).to.equal("09:00");
    expect(updateArgs.data.timezone).to.equal("America/Chicago");
  });

  it("should reject invalid time format", async () => {
    const { schedule } = await loadModule({ premiumEnabled: false });
    const interaction = makeScheduleInteraction({ time: "25:99" });

    await schedule(localMockClient(), interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("Invalid time format");
  });

  it("should reject invalid timezone", async () => {
    const { schedule } = await loadModule({ premiumEnabled: false });
    const interaction = makeScheduleInteraction({ time: "08:00", timezone: "Fake/Timezone" });

    await schedule(localMockClient(), interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("Invalid timezone");
  });

  it("should reject weekly without day", async () => {
    const { schedule } = await loadModule({ premiumEnabled: false });
    const interaction = makeScheduleInteraction({
      frequency: "Weekly",
      time: "08:00",
      timezone: "America/Chicago",
      day: null,
    });

    await schedule(localMockClient(), interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("Weekly frequency requires");
  });

  it("should reject monthly with out-of-range day", async () => {
    const { schedule } = await loadModule({ premiumEnabled: false });
    const interaction = makeScheduleInteraction({
      frequency: "Monthly",
      time: "08:00",
      timezone: "America/Chicago",
      day: 31,
    });

    await schedule(localMockClient(), interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("Monthly frequency requires");
  });

  it("should accept valid weekly schedule with day", async () => {
    const { schedule, prisma } = await loadModule({ premiumEnabled: false });
    const interaction = makeScheduleInteraction({
      frequency: "Weekly",
      time: "14:30",
      timezone: "America/New_York",
      day: 3,
    });

    await schedule(localMockClient(), interaction as never);

    expect(prisma.guild.update.calledOnce).to.be.true;
    const updateArgs = prisma.guild.update.firstCall.args[0];
    expect(updateArgs.data.motivationDay).to.equal(3);
  });

  it("should return early when no guildId", async () => {
    const { schedule, prisma } = await loadModule({ premiumEnabled: false });
    const interaction = makeScheduleInteraction({ guildId: null });

    await schedule(localMockClient(), interaction as never);

    expect(prisma.guild.update.called).to.be.false;
    expect((interaction.reply as sinon.SinonStub).called).to.be.false;
  });
});

function localMockClient() {
  return {} as never;
}
