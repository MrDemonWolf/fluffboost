import { describe, it, expect } from "bun:test";
import { cronToText, isValidCron, getCronDetails } from "../../src/utils/cronParser.js";

describe("cronParser", () => {
  describe("cronToText", () => {
    it("should convert a valid cron expression to human-readable text", () => {
      const result = cronToText("0 8 * * *");
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toContain("Invalid");
    });

    it("should return error text for an invalid expression", () => {
      const result = cronToText("not a cron");
      // cronstrue with throwExceptionOnParseError: false returns its own error text
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    it("should apply default options (24-hour, sentence casing)", () => {
      const result = cronToText("30 14 * * *");
      expect(result).toContain("14:30");
    });

    it("should allow overriding default options", () => {
      const result = cronToText("0 8 * * *", { use24HourTimeFormat: false });
      expect(typeof result).toBe("string");
    });

    it("should handle every-minute expression", () => {
      const result = cronToText("* * * * *");
      expect(typeof result).toBe("string");
      expect(result).not.toContain("Invalid");
    });
  });

  describe("isValidCron", () => {
    it("should return true for valid cron expressions", () => {
      expect(isValidCron("0 8 * * *")).toBe(true);
      expect(isValidCron("*/5 * * * *")).toBe(true);
      expect(isValidCron("0 0 1 * *")).toBe(true);
    });

    it("should return false for invalid cron expressions", () => {
      expect(isValidCron("not a cron")).toBe(false);
      expect(isValidCron("")).toBe(false);
    });
  });

  describe("getCronDetails", () => {
    it("should return correct shape for a valid expression", () => {
      const details = getCronDetails("0 8 * * *");
      expect(details).toHaveProperty("expression", "0 8 * * *");
      expect(details).toHaveProperty("isValid", true);
      expect(details).toHaveProperty("description");
      expect(typeof details.description).toBe("string");
      expect(details.description).not.toBe("Invalid cron expression");
    });

    it("should return correct shape for an invalid expression", () => {
      const details = getCronDetails("bad");
      expect(details).toHaveProperty("expression", "bad");
      expect(details).toHaveProperty("isValid", false);
      expect(details).toHaveProperty("description", "Invalid cron expression");
    });
  });
});
