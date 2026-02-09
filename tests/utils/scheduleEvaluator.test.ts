import { expect } from "chai";
import sinon from "sinon";
import { getCurrentTimeInTimezone, isGuildDueForMotivation } from "../../src/utils/scheduleEvaluator.js";

interface TestGuild {
  motivationFrequency: "Daily" | "Weekly" | "Monthly";
  motivationTime: string;
  motivationDay: number | null;
  timezone: string;
  lastMotivationSentAt: Date | null;
}

function makeGuild(overrides: Partial<TestGuild> = {}): TestGuild {
  return {
    motivationFrequency: "Daily",
    motivationTime: "08:00",
    motivationDay: null,
    timezone: "America/Chicago",
    lastMotivationSentAt: null,
    ...overrides,
  };
}

describe("scheduleEvaluator", () => {
  let clock: sinon.SinonFakeTimers;

  afterEach(() => {
    if (clock) {
      clock.restore();
    }
  });

  describe("getCurrentTimeInTimezone", () => {
    it("should return correct components for UTC", () => {
      // 2024-03-15 10:30:00 UTC (Friday)
      clock = sinon.useFakeTimers(new Date("2024-03-15T10:30:00Z").getTime());
      const result = getCurrentTimeInTimezone("UTC");
      expect(result.hour).to.equal(10);
      expect(result.minute).to.equal(30);
      expect(result.dayOfWeek).to.equal(5); // Friday
      expect(result.dayOfMonth).to.equal(15);
    });

    it("should convert UTC to America/Chicago (CST = UTC-6)", () => {
      // 2024-01-15 14:00:00 UTC → 08:00 CST
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const result = getCurrentTimeInTimezone("America/Chicago");
      expect(result.hour).to.equal(8);
      expect(result.minute).to.equal(0);
    });

    it("should convert UTC to Asia/Tokyo (UTC+9)", () => {
      // 2024-01-15 00:00:00 UTC → 09:00 JST
      clock = sinon.useFakeTimers(new Date("2024-01-15T00:00:00Z").getTime());
      const result = getCurrentTimeInTimezone("Asia/Tokyo");
      expect(result.hour).to.equal(9);
      expect(result.minute).to.equal(0);
    });

    it("should handle date rollback in negative-offset timezone", () => {
      // 2024-01-16 02:00:00 UTC → 2024-01-15 18:00 in LA (UTC-8)
      clock = sinon.useFakeTimers(new Date("2024-01-16T02:00:00Z").getTime());
      const result = getCurrentTimeInTimezone("America/Los_Angeles");
      expect(result.hour).to.equal(18);
      expect(result.dayOfMonth).to.equal(15);
    });

    it("should return all four keys", () => {
      clock = sinon.useFakeTimers(new Date("2024-01-15T12:00:00Z").getTime());
      const result = getCurrentTimeInTimezone("UTC");
      expect(result).to.have.all.keys("hour", "minute", "dayOfWeek", "dayOfMonth");
    });
  });

  describe("isGuildDueForMotivation — Daily", () => {
    it("should return true when time matches and no prior send", () => {
      // 2024-01-15 14:00:00 UTC → 08:00 CST
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild();
      expect(isGuildDueForMotivation(guild)).to.be.true;
    });

    it("should return false when time does not match", () => {
      // 2024-01-15 15:00:00 UTC → 09:00 CST (target is 08:00)
      clock = sinon.useFakeTimers(new Date("2024-01-15T15:00:00Z").getTime());
      const guild = makeGuild();
      expect(isGuildDueForMotivation(guild)).to.be.false;
    });

    it("should return false when hour matches but minute does not", () => {
      // 2024-01-15 14:30:00 UTC → 08:30 CST (target is 08:00)
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:30:00Z").getTime());
      const guild = makeGuild();
      expect(isGuildDueForMotivation(guild)).to.be.false;
    });

    it("should return false when already sent today", () => {
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        lastMotivationSentAt: new Date("2024-01-15T14:00:00Z"),
      });
      expect(isGuildDueForMotivation(guild)).to.be.false;
    });

    it("should return true when last sent was yesterday", () => {
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        lastMotivationSentAt: new Date("2024-01-14T14:00:00Z"),
      });
      expect(isGuildDueForMotivation(guild)).to.be.true;
    });
  });

  describe("isGuildDueForMotivation — Weekly", () => {
    it("should return true when day-of-week and time match", () => {
      // 2024-01-15 is Monday (day 1), 14:00 UTC → 08:00 CST
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Weekly",
        motivationDay: 1, // Monday
      });
      expect(isGuildDueForMotivation(guild)).to.be.true;
    });

    it("should return false when day-of-week does not match", () => {
      // 2024-01-15 is Monday (day 1), but guild wants Wednesday (day 3)
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Weekly",
        motivationDay: 3, // Wednesday
      });
      expect(isGuildDueForMotivation(guild)).to.be.false;
    });

    it("should return false when motivationDay is null", () => {
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Weekly",
        motivationDay: null,
      });
      expect(isGuildDueForMotivation(guild)).to.be.false;
    });

    it("should return false when already sent this week", () => {
      // Monday 2024-01-15
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Weekly",
        motivationDay: 1,
        // Sent earlier this same week (same Monday)
        lastMotivationSentAt: new Date("2024-01-15T08:00:00Z"),
      });
      expect(isGuildDueForMotivation(guild)).to.be.false;
    });

    it("should return true when last sent was last week", () => {
      // Monday 2024-01-15
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Weekly",
        motivationDay: 1,
        lastMotivationSentAt: new Date("2024-01-08T14:00:00Z"), // Previous Monday
      });
      expect(isGuildDueForMotivation(guild)).to.be.true;
    });
  });

  describe("isGuildDueForMotivation — Monthly", () => {
    it("should return true when day-of-month and time match", () => {
      // 2024-01-15 14:00 UTC → 08:00 CST
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Monthly",
        motivationDay: 15,
      });
      expect(isGuildDueForMotivation(guild)).to.be.true;
    });

    it("should return false when day-of-month does not match", () => {
      // 2024-01-15, but guild wants day 20
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Monthly",
        motivationDay: 20,
      });
      expect(isGuildDueForMotivation(guild)).to.be.false;
    });

    it("should return false when motivationDay is null", () => {
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Monthly",
        motivationDay: null,
      });
      expect(isGuildDueForMotivation(guild)).to.be.false;
    });

    it("should return false when already sent this month", () => {
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Monthly",
        motivationDay: 15,
        lastMotivationSentAt: new Date("2024-01-15T08:00:00Z"),
      });
      expect(isGuildDueForMotivation(guild)).to.be.false;
    });

    it("should return true when last sent was last month", () => {
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Monthly",
        motivationDay: 15,
        lastMotivationSentAt: new Date("2023-12-15T14:00:00Z"),
      });
      expect(isGuildDueForMotivation(guild)).to.be.true;
    });
  });

  describe("edge cases", () => {
    it("should handle midnight (00:00)", () => {
      // 2024-01-15 06:00 UTC → 00:00 CST
      clock = sinon.useFakeTimers(new Date("2024-01-15T06:00:00Z").getTime());
      const guild = makeGuild({ motivationTime: "00:00" });
      expect(isGuildDueForMotivation(guild)).to.be.true;
    });

    it("should handle end of day (23:59)", () => {
      // 2024-01-16 05:59 UTC → 23:59 CST on Jan 15
      clock = sinon.useFakeTimers(new Date("2024-01-16T05:59:00Z").getTime());
      const guild = makeGuild({ motivationTime: "23:59" });
      expect(isGuildDueForMotivation(guild)).to.be.true;
    });

    it("should handle Sunday (day 0) for weekly", () => {
      // 2024-01-14 is Sunday
      clock = sinon.useFakeTimers(new Date("2024-01-14T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Weekly",
        motivationDay: 0, // Sunday
      });
      expect(isGuildDueForMotivation(guild)).to.be.true;
    });

    it("should handle timezone day boundary where UTC date differs from local date", () => {
      // 2024-01-16 01:00 UTC → 2024-01-16 10:00 JST (Asia/Tokyo, UTC+9)
      // Day of month in Tokyo is 16, not 15
      clock = sinon.useFakeTimers(new Date("2024-01-16T01:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Monthly",
        motivationDay: 16,
        motivationTime: "10:00",
        timezone: "Asia/Tokyo",
      });
      expect(isGuildDueForMotivation(guild)).to.be.true;
    });
  });
});
