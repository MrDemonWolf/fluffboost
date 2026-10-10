import { describe, it, expect } from "bun:test";
import { ALL_TIMEZONES, isValidTimezone, filterTimezones } from "../../src/utils/timezones.js";

describe("timezones", () => {
  describe("ALL_TIMEZONES", () => {
    it("should be a non-empty array", () => {
      expect(Array.isArray(ALL_TIMEZONES)).toBe(true);
      expect(ALL_TIMEZONES.length).toBeGreaterThan(0);
    });

    it("should contain well-known IANA timezones", () => {
      expect(ALL_TIMEZONES).toContain("America/New_York");
      expect(ALL_TIMEZONES).toContain("Europe/London");
      expect(ALL_TIMEZONES).toContain("Asia/Tokyo");
      expect(ALL_TIMEZONES).toContain("America/Chicago");
    });

    it("should not contain duplicates", () => {
      const unique = new Set(ALL_TIMEZONES);
      expect(unique.size).toBe(ALL_TIMEZONES.length);
    });
  });

  describe("isValidTimezone", () => {
    it("should return true for valid IANA timezones", () => {
      expect(isValidTimezone("America/New_York")).toBe(true);
      expect(isValidTimezone("UTC")).toBe(true);
      expect(isValidTimezone("Asia/Tokyo")).toBe(true);
    });

    it("should return false for invalid timezone strings", () => {
      expect(isValidTimezone("Not/A/Timezone")).toBe(false);
      expect(isValidTimezone("FakeZone")).toBe(false);
      expect(isValidTimezone("")).toBe(false);
    });

    it("should return false for partial timezone names", () => {
      expect(isValidTimezone("America")).toBe(false);
      expect(isValidTimezone("New_York")).toBe(false);
    });
  });

  describe("filterTimezones", () => {
    it("should return matching timezones case-insensitively", () => {
      const results = filterTimezones("america/ch");
      expect(results).toContain("America/Chicago");
      expect(results.every((tz) => tz.toLowerCase().includes("america/ch"))).toBe(true);
    });

    it("should return at most 25 results", () => {
      const results = filterTimezones("America");
      expect(results.length).toBeLessThanOrEqual(25);
    });

    it("should match partial strings", () => {
      const results = filterTimezones("tokyo");
      expect(results).toContain("Asia/Tokyo");
    });

    it("should return empty array for no matches", () => {
      const results = filterTimezones("xyznonexistent");
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(0);
    });

    it("should return a curated list of common zones for an empty query", () => {
      const results = filterTimezones("");
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(25);
      expect(results[0]).toBe("America/Chicago");
      expect(results).toContain("America/New_York");
      expect(results).not.toContain("Africa/Abidjan");
      expect(results.every(isValidTimezone)).toBe(true);
      expect(filterTimezones("   ")).toEqual(results);
    });

    it.each([
      ["new york", "America/New_York"],
      ["los angeles", "America/Los_Angeles"],
      ["  Buenos Aires ", "America/Argentina/Buenos_Aires"],
      ["port au prince", "America/Port-au-Prince"],
      ["port-au-prince", "America/Port-au-Prince"],
      ["new_york", "America/New_York"],
    ])("normalizes spaces, underscores and hyphens (%p)", (query, expected) => {
      expect(filterTimezones(query)).toContain(expected);
    });

    it.each([
      ["kolkata", "Asia/Kolkata"],
      ["kyiv", "Europe/Kyiv"],
      ["ho chi minh", "Asia/Ho_Chi_Minh"],
      ["kathmandu", "Asia/Kathmandu"],
      ["yangon", "Asia/Yangon"],
      ["nuuk", "America/Nuuk"],
    ])("suggests the modern IANA name for %p", (query, expected) => {
      expect(filterTimezones(query)).toContain(expected);
      expect(isValidTimezone(expected)).toBe(true);
    });

    it("ranks city-name prefix matches first", () => {
      // "ind" hits city prefixes (Indiana/..., Indian/...) and mid-name matches.
      const results = filterTimezones("ind");
      const cityPrefix = results.findIndex((tz) => tz.split("/").pop()?.toLowerCase().startsWith("ind"));
      const nonPrefix = results.findIndex((tz) => !tz.split("/").pop()?.toLowerCase().startsWith("ind"));
      expect(cityPrefix).toBeGreaterThanOrEqual(0);
      expect(nonPrefix === -1 || cityPrefix < nonPrefix).toBe(true);
    });
  });
});
