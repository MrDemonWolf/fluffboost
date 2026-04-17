import { describe, it, expect } from "bun:test";
import { parseHourMinute } from "../../src/utils/scheduleEvaluator.js";

describe("scheduleEvaluator.parseHourMinute", () => {
  it("parses valid HH:mm", () => {
    expect(parseHourMinute("08:00")).toEqual({ hour: 8, minute: 0 });
    expect(parseHourMinute("23:59")).toEqual({ hour: 23, minute: 59 });
    expect(parseHourMinute("00:00")).toEqual({ hour: 0, minute: 0 });
  });

  it("rejects out-of-range hour", () => {
    expect(parseHourMinute("25:00")).toBeNull();
    expect(parseHourMinute("24:01")).toBeNull();
  });

  it("rejects out-of-range minute", () => {
    expect(parseHourMinute("10:60")).toBeNull();
    expect(parseHourMinute("10:99")).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(parseHourMinute("")).toBeNull();
    expect(parseHourMinute("garbage")).toBeNull();
    expect(parseHourMinute("8:00")).toBeNull();
    expect(parseHourMinute("08:0")).toBeNull();
  });
});
