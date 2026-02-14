import { expect } from "chai";
import { cronToText, isValidCron, getCronDetails } from "../../src/utils/cronParser.js";

describe("cronParser", () => {
  describe("cronToText", () => {
    it("should convert a valid cron expression to human-readable text", () => {
      const result = cronToText("0 8 * * *");
      expect(result).to.be.a("string");
      expect(result.length).to.be.greaterThan(0);
      expect(result).to.not.include("Invalid");
    });

    it("should return error text for an invalid expression", () => {
      const result = cronToText("not a cron");
      // cronstrue with throwExceptionOnParseError: false returns its own error text
      expect(result).to.be.a("string");
      expect(result.length).to.be.greaterThan(0);
    });

    it("should apply default options (24-hour, sentence casing)", () => {
      const result = cronToText("30 14 * * *");
      expect(result).to.include("14:30");
    });

    it("should allow overriding default options", () => {
      const result = cronToText("0 8 * * *", { use24HourTimeFormat: false });
      expect(result).to.be.a("string");
    });

    it("should handle every-minute expression", () => {
      const result = cronToText("* * * * *");
      expect(result).to.be.a("string");
      expect(result).to.not.include("Invalid");
    });
  });

  describe("isValidCron", () => {
    it("should return true for valid cron expressions", () => {
      expect(isValidCron("0 8 * * *")).to.be.true;
      expect(isValidCron("*/5 * * * *")).to.be.true;
      expect(isValidCron("0 0 1 * *")).to.be.true;
    });

    it("should return false for invalid cron expressions", () => {
      expect(isValidCron("not a cron")).to.be.false;
      expect(isValidCron("")).to.be.false;
    });
  });

  describe("getCronDetails", () => {
    it("should return correct shape for a valid expression", () => {
      const details = getCronDetails("0 8 * * *");
      expect(details).to.have.property("expression", "0 8 * * *");
      expect(details).to.have.property("isValid", true);
      expect(details).to.have.property("description").that.is.a("string");
      expect(details.description).to.not.equal("Invalid cron expression");
    });

    it("should return correct shape for an invalid expression", () => {
      const details = getCronDetails("bad");
      expect(details).to.have.property("expression", "bad");
      expect(details).to.have.property("isValid", false);
      expect(details).to.have.property("description", "Invalid cron expression");
    });
  });
});
