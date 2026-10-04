import { describe, it, expect, afterEach } from "bun:test";
import sinon from "sinon";
import {
  effectiveGuildSchedule, getCurrentTimeInTimezone, isGuildDueForMotivation,
  mostRecentScheduledOccurrence,
} from "../../src/utils/scheduleEvaluator.js";

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
      expect(result.hour).toBe(10);
      expect(result.minute).toBe(30);
      expect(result.dayOfWeek).toBe(5); // Friday
      expect(result.dayOfMonth).toBe(15);
    });

    it("should convert UTC to America/Chicago (CST = UTC-6)", () => {
      // 2024-01-15 14:00:00 UTC → 08:00 CST
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const result = getCurrentTimeInTimezone("America/Chicago");
      expect(result.hour).toBe(8);
      expect(result.minute).toBe(0);
    });

    it("should convert UTC to Asia/Tokyo (UTC+9)", () => {
      // 2024-01-15 00:00:00 UTC → 09:00 JST
      clock = sinon.useFakeTimers(new Date("2024-01-15T00:00:00Z").getTime());
      const result = getCurrentTimeInTimezone("Asia/Tokyo");
      expect(result.hour).toBe(9);
      expect(result.minute).toBe(0);
    });

    it("should handle date rollback in negative-offset timezone", () => {
      // 2024-01-16 02:00:00 UTC → 2024-01-15 18:00 in LA (UTC-8)
      clock = sinon.useFakeTimers(new Date("2024-01-16T02:00:00Z").getTime());
      const result = getCurrentTimeInTimezone("America/Los_Angeles");
      expect(result.hour).toBe(18);
      expect(result.dayOfMonth).toBe(15);
    });

    it("should return all four keys", () => {
      clock = sinon.useFakeTimers(new Date("2024-01-15T12:00:00Z").getTime());
      const result = getCurrentTimeInTimezone("UTC");
      expect(result).toHaveProperty("hour");
      expect(result).toHaveProperty("minute");
      expect(result).toHaveProperty("dayOfWeek");
      expect(result).toHaveProperty("dayOfMonth");
    });
  });

  describe("isGuildDueForMotivation — Daily", () => {
    it("should return true when time matches and no prior send", () => {
      // 2024-01-15 14:00:00 UTC → 08:00 CST
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild();
      expect(isGuildDueForMotivation(guild)).toBe(true);
    });

    it("should return false before the scheduled time", () => {
      // 2024-01-15 13:30:00 UTC → 07:30 CST (target is 08:00)
      clock = sinon.useFakeTimers(new Date("2024-01-15T13:30:00Z").getTime());
      const guild = makeGuild();
      expect(isGuildDueForMotivation(guild)).toBe(false);
    });

    it("should return true within the catch-up window after the scheduled time", () => {
      // 2024-01-15 15:00:00 UTC → 09:00 CST (target 08:00, 1h late — a missed
      // tick must catch up instead of dropping the day's send)
      clock = sinon.useFakeTimers(new Date("2024-01-15T15:00:00Z").getTime());
      const guild = makeGuild();
      expect(isGuildDueForMotivation(guild)).toBe(true);
    });

    it("should return false once past the catch-up window", () => {
      // 2024-01-15 21:00:00 UTC → 15:00 CST (target 08:00, 7h late > 6h window)
      clock = sinon.useFakeTimers(new Date("2024-01-15T21:00:00Z").getTime());
      const guild = makeGuild();
      expect(isGuildDueForMotivation(guild)).toBe(false);
    });

    it("should not send twice within the catch-up window", () => {
      // 09:00 CST, already sent at 08:00 CST today
      clock = sinon.useFakeTimers(new Date("2024-01-15T15:00:00Z").getTime());
      const guild = makeGuild({
        lastMotivationSentAt: new Date("2024-01-15T14:00:00Z"),
      });
      expect(isGuildDueForMotivation(guild)).toBe(false);
    });

    it("should catch up across midnight (23:59 slot evaluated at 00:03)", () => {
      // 2024-01-16 06:03 UTC → 00:03 CST on Jan 16; most recent 23:59 slot is
      // Jan 15 23:59 CST — only 4 minutes ago, must still be due.
      clock = sinon.useFakeTimers(new Date("2024-01-16T06:03:00Z").getTime());
      const guild = makeGuild({ motivationTime: "23:59" });
      expect(isGuildDueForMotivation(guild)).toBe(true);
    });

    it("should dedupe across midnight when yesterday's slot was already sent", () => {
      // Same 00:03 evaluation, but the 23:59 send already happened at 23:59:30.
      clock = sinon.useFakeTimers(new Date("2024-01-16T06:03:00Z").getTime());
      const guild = makeGuild({
        motivationTime: "23:59",
        lastMotivationSentAt: new Date("2024-01-16T05:59:30Z"),
      });
      expect(isGuildDueForMotivation(guild)).toBe(false);
    });

    it("should return false when already sent today", () => {
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        lastMotivationSentAt: new Date("2024-01-15T14:00:00Z"),
      });
      expect(isGuildDueForMotivation(guild)).toBe(false);
    });

    it("should return true when last sent was yesterday", () => {
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        lastMotivationSentAt: new Date("2024-01-14T14:00:00Z"),
      });
      expect(isGuildDueForMotivation(guild)).toBe(true);
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
      expect(isGuildDueForMotivation(guild)).toBe(true);
    });

    it("should return false when day-of-week does not match", () => {
      // 2024-01-15 is Monday (day 1), but guild wants Wednesday (day 3)
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Weekly",
        motivationDay: 3, // Wednesday
      });
      expect(isGuildDueForMotivation(guild)).toBe(false);
    });

    it("should return false when motivationDay is null", () => {
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Weekly",
        motivationDay: null,
      });
      expect(isGuildDueForMotivation(guild)).toBe(false);
    });

    it("should return false when already sent this week", () => {
      // Monday 2024-01-15
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Weekly",
        motivationDay: 1,
        // Sent at this week's occurrence (sends always stamp at/after it)
        lastMotivationSentAt: new Date("2024-01-15T14:00:00Z"),
      });
      expect(isGuildDueForMotivation(guild)).toBe(false);
    });

    it("should return true when last sent was last week", () => {
      // Monday 2024-01-15
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Weekly",
        motivationDay: 1,
        lastMotivationSentAt: new Date("2024-01-08T14:00:00Z"), // Previous Monday
      });
      expect(isGuildDueForMotivation(guild)).toBe(true);
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
      expect(isGuildDueForMotivation(guild)).toBe(true);
    });

    it("should return false when day-of-month does not match", () => {
      // 2024-01-15, but guild wants day 20
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Monthly",
        motivationDay: 20,
      });
      expect(isGuildDueForMotivation(guild)).toBe(false);
    });

    it("should return false when motivationDay is null", () => {
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Monthly",
        motivationDay: null,
      });
      expect(isGuildDueForMotivation(guild)).toBe(false);
    });

    it("should return false when already sent this month", () => {
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Monthly",
        motivationDay: 15,
        // Sent at this month's occurrence (sends always stamp at/after it)
        lastMotivationSentAt: new Date("2024-01-15T14:00:00Z"),
      });
      expect(isGuildDueForMotivation(guild)).toBe(false);
    });

    it("should return true when last sent was last month", () => {
      clock = sinon.useFakeTimers(new Date("2024-01-15T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Monthly",
        motivationDay: 15,
        lastMotivationSentAt: new Date("2023-12-15T14:00:00Z"),
      });
      expect(isGuildDueForMotivation(guild)).toBe(true);
    });
  });

  describe("edge cases", () => {
    const offsetCases = [
      { name: "spring gap before shifted time", now: "2026-03-08T08:00:00Z", time: "02:30", anchor: "2026-03-07T08:30:00Z", due: false },
      { name: "spring gap at shifted time", now: "2026-03-08T08:30:00Z", time: "02:30", anchor: "2026-03-08T08:30:00Z", due: true },
      { name: "spring midnight catch-up", now: "2026-03-08T11:00:00Z", time: "23:59", anchor: "2026-03-08T05:59:00Z", due: true },
      { name: "fall expired catch-up", now: "2026-11-01T11:10:00Z", time: "23:59", anchor: "2026-11-01T04:59:00Z", due: false },
    ];
    for (const test of offsetCases) {
      it(`resolves the occurrence's own offset: ${test.name}`, () => {
        clock = sinon.useFakeTimers(new Date(test.now).getTime());
        const guild = makeGuild({ motivationTime: test.time });
        expect(mostRecentScheduledOccurrence(guild)?.toISOString()).toBe(new Date(test.anchor).toISOString());
        expect(isGuildDueForMotivation(guild)).toBe(test.due);
      });
    }
    for (const frequency of ["Weekly", "Monthly"] as const) {
      it(`keeps ${frequency} spring catch-up within the correct window`, () => {
        clock = sinon.useFakeTimers(new Date("2026-03-08T13:00:00Z").getTime());
        const guild = makeGuild({ motivationFrequency: frequency, motivationTime: "01:30",
          motivationDay: frequency === "Weekly" ? 0 : 8 });
        expect(mostRecentScheduledOccurrence(guild)?.toISOString()).toBe("2026-03-08T07:30:00.000Z");
        expect(isGuildDueForMotivation(guild)).toBe(true);
      });
      it(`rejects ${frequency} fall catch-up outside the correct window`, () => {
        clock = sinon.useFakeTimers(new Date("2026-11-01T11:45:00Z").getTime());
        const guild = makeGuild({ motivationFrequency: frequency, motivationTime: "00:30",
          motivationDay: frequency === "Weekly" ? 0 : 1 });
        expect(mostRecentScheduledOccurrence(guild)?.toISOString()).toBe("2026-11-01T05:30:00.000Z");
        expect(isGuildDueForMotivation(guild)).toBe(false);
      });
    }
    it.each(["Daily", "Weekly", "Monthly"] as const)(
      "does not deliver %s twice during the repeated fall DST hour", (motivationFrequency) => {
      clock = sinon.useFakeTimers(new Date("2026-11-01T06:31:00Z").getTime());
      const guild = makeGuild({
        motivationTime: "01:30", motivationFrequency,
        motivationDay: motivationFrequency === "Weekly" ? 0 : motivationFrequency === "Monthly" ? 1 : null,
      });
      expect(isGuildDueForMotivation(guild)).toBe(true);
      guild.lastMotivationSentAt = new Date();
      clock.setSystemTime(new Date("2026-11-01T07:31:00Z"));
      expect(isGuildDueForMotivation(guild)).toBe(false);
    });
    it("does not let a late midnight catch-up suppress the next evening's quote", () => {
      clock = sinon.useFakeTimers(new Date("2026-01-16T06:03:00Z").getTime());
      const guild = makeGuild({ motivationTime: "23:59" });
      expect(isGuildDueForMotivation(guild)).toBe(true);
      guild.lastMotivationSentAt = new Date();
      clock.setSystemTime(new Date("2026-01-17T05:59:00Z"));
      expect(isGuildDueForMotivation(guild)).toBe(true);
    });
    it("uses the free schedule after expiry without discarding saved customization", () => {
      const guild = { ...makeGuild({ motivationTime: "22:00", timezone: "Europe/London" }), isPremium: false };
      const effective = effectiveGuildSchedule(guild, true);
      expect(effective.motivationFrequency).toBe("Daily");
      expect(effective.motivationTime).toBe("08:00");
      expect(effective.timezone).toBe("America/Chicago");
      expect(guild.motivationTime).toBe("22:00");
      expect(effectiveGuildSchedule({ ...guild, isPremium: true }, true).motivationTime).toBe("22:00");
    });
    it("should handle midnight (00:00)", () => {
      // 2024-01-15 06:00 UTC → 00:00 CST
      clock = sinon.useFakeTimers(new Date("2024-01-15T06:00:00Z").getTime());
      const guild = makeGuild({ motivationTime: "00:00" });
      expect(isGuildDueForMotivation(guild)).toBe(true);
    });

    it("should handle end of day (23:59)", () => {
      // 2024-01-16 05:59 UTC → 23:59 CST on Jan 15
      clock = sinon.useFakeTimers(new Date("2024-01-16T05:59:00Z").getTime());
      const guild = makeGuild({ motivationTime: "23:59" });
      expect(isGuildDueForMotivation(guild)).toBe(true);
    });

    it("should handle Sunday (day 0) for weekly", () => {
      // 2024-01-14 is Sunday
      clock = sinon.useFakeTimers(new Date("2024-01-14T14:00:00Z").getTime());
      const guild = makeGuild({
        motivationFrequency: "Weekly",
        motivationDay: 0, // Sunday
      });
      expect(isGuildDueForMotivation(guild)).toBe(true);
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
      expect(isGuildDueForMotivation(guild)).toBe(true);
    });
  });
});
