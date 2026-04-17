import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockInteraction, stubBuildPremiumUpsell } from "../../helpers.js";

describe("setup schedule command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: { premiumEnabled?: boolean; hasEntitlement?: boolean } = {}) {
    const logger = mockLogger();
    const db = mockDb();

    mock.module("../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../../src/utils/premium.js", () => ({
      isPremiumEnabled: sinon.stub().returns(overrides.premiumEnabled ?? false),
      hasEntitlement: sinon.stub().returns(overrides.hasEntitlement ?? false),
      getPremiumSkuId: sinon.stub().returns("sku-1"),
      buildPremiumUpsell: stubBuildPremiumUpsell("sku-1"),
    }));
    mock.module("../../../src/utils/guildDatabase.js", () => ({
      guildExists: sinon.stub().resolves(true),
      pruneGuilds: sinon.stub().resolves(),
      ensureGuildExists: sinon.stub().resolves(),
    }));
    mock.module("../../../src/utils/timezones.js", () => ({
      isValidTimezone: sinon.stub().callsFake((tz: string) => {
        return ["America/Chicago", "America/New_York", "Europe/London", "UTC"].includes(tz);
      }),
      filterTimezones: sinon.stub().returns([]),
    }));

    const mod = await import("../../../src/commands/setup/schedule.js");

    return { schedule: mod.default, logger, db };
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

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.embeds[0].data.title).toBe("Premium Feature");
  });

  it("should update guild with valid daily schedule", async () => {
    const { schedule, db } = await loadModule({ premiumEnabled: false });
    const chain = mockDbChain([]);
    db.update.returns(chain);
    const interaction = makeScheduleInteraction({ frequency: "Daily", time: "09:00", timezone: "America/Chicago" });

    await schedule(localMockClient(), interaction as never);

    expect(db.update.calledOnce).toBe(true);
    const setArgs = (chain.set as sinon.SinonStub).firstCall.args[0];
    expect(setArgs.motivationFrequency).toBe("Daily");
    expect(setArgs.motivationTime).toBe("09:00");
    expect(setArgs.timezone).toBe("America/Chicago");
  });

  it("should reject invalid time format", async () => {
    const { schedule } = await loadModule({ premiumEnabled: false });
    const interaction = makeScheduleInteraction({ time: "25:99" });

    await schedule(localMockClient(), interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Invalid time format");
  });

  it("should reject invalid timezone", async () => {
    const { schedule } = await loadModule({ premiumEnabled: false });
    const interaction = makeScheduleInteraction({ time: "08:00", timezone: "Fake/Timezone" });

    await schedule(localMockClient(), interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Invalid timezone");
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
    expect(replyArgs.content).toContain("Weekly frequency requires");
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
    expect(replyArgs.content).toContain("Monthly frequency requires");
  });

  it("should accept valid weekly schedule with day", async () => {
    const { schedule, db } = await loadModule({ premiumEnabled: false });
    const chain = mockDbChain([]);
    db.update.returns(chain);
    const interaction = makeScheduleInteraction({
      frequency: "Weekly",
      time: "14:30",
      timezone: "America/New_York",
      day: 3,
    });

    await schedule(localMockClient(), interaction as never);

    expect(db.update.calledOnce).toBe(true);
    const setArgs = (chain.set as sinon.SinonStub).firstCall.args[0];
    expect(setArgs.motivationDay).toBe(3);
  });

  it("should return early when no guildId", async () => {
    const { schedule, db } = await loadModule({ premiumEnabled: false });
    const interaction = makeScheduleInteraction({ guildId: null });

    await schedule(localMockClient(), interaction as never);

    expect(db.update.called).toBe(false);
    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
  });

  it("should catch autocomplete errors and respond with empty array", async () => {
    const logger = mockLogger();
    const db = mockDb();

    mock.module("../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../../src/utils/premium.js", () => ({
      isPremiumEnabled: sinon.stub().returns(false),
      hasEntitlement: sinon.stub().returns(false),
      getPremiumSkuId: sinon.stub().returns("sku-1"),
      buildPremiumUpsell: stubBuildPremiumUpsell("sku-1"),
    }));
    mock.module("../../../src/utils/guildDatabase.js", () => ({
      guildExists: sinon.stub().resolves(true),
      pruneGuilds: sinon.stub().resolves(),
      ensureGuildExists: sinon.stub().resolves(),
    }));
    mock.module("../../../src/utils/timezones.js", () => ({
      isValidTimezone: sinon.stub().returns(true),
      filterTimezones: sinon.stub().throws(new Error("timezone error")),
    }));

    const mod = await import("../../../src/commands/setup/schedule.js");

    const interaction = {
      options: {
        getFocused: sinon.stub().returns({ name: "timezone", value: "Amer" }),
      },
      respond: sinon.stub().resolves(),
    };

    await mod.autocomplete(interaction as never);

    expect(logger.error.called).toBe(true);
    expect(interaction.respond.calledWith([])).toBe(true);
  });
});

function localMockClient() {
  return {} as never;
}
