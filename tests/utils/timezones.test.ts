import { expect } from "chai";
import { ALL_TIMEZONES, isValidTimezone, filterTimezones } from "../../src/utils/timezones.js";

describe("timezones", () => {
  describe("ALL_TIMEZONES", () => {
    it("should be a non-empty array", () => {
      expect(ALL_TIMEZONES).to.be.an("array").that.is.not.empty;
    });

    it("should contain well-known IANA timezones", () => {
      expect(ALL_TIMEZONES).to.include("America/New_York");
      expect(ALL_TIMEZONES).to.include("Europe/London");
      expect(ALL_TIMEZONES).to.include("Asia/Tokyo");
      expect(ALL_TIMEZONES).to.include("America/Chicago");
    });

    it("should not contain duplicates", () => {
      const unique = new Set(ALL_TIMEZONES);
      expect(unique.size).to.equal(ALL_TIMEZONES.length);
    });
  });

  describe("isValidTimezone", () => {
    it("should return true for valid IANA timezones", () => {
      expect(isValidTimezone("America/New_York")).to.be.true;
      expect(isValidTimezone("UTC")).to.be.true;
      expect(isValidTimezone("Asia/Tokyo")).to.be.true;
    });

    it("should return false for invalid timezone strings", () => {
      expect(isValidTimezone("Not/A/Timezone")).to.be.false;
      expect(isValidTimezone("FakeZone")).to.be.false;
      expect(isValidTimezone("")).to.be.false;
    });

    it("should return false for partial timezone names", () => {
      expect(isValidTimezone("America")).to.be.false;
      expect(isValidTimezone("New_York")).to.be.false;
    });
  });

  describe("filterTimezones", () => {
    it("should return matching timezones case-insensitively", () => {
      const results = filterTimezones("america/ch");
      expect(results).to.include("America/Chicago");
      expect(results.every((tz) => tz.toLowerCase().includes("america/ch"))).to.be.true;
    });

    it("should return at most 25 results", () => {
      const results = filterTimezones("America");
      expect(results.length).to.be.at.most(25);
    });

    it("should match partial strings", () => {
      const results = filterTimezones("tokyo");
      expect(results).to.include("Asia/Tokyo");
    });

    it("should return empty array for no matches", () => {
      const results = filterTimezones("xyznonexistent");
      expect(results).to.be.an("array").that.is.empty;
    });

    it("should return 25 results for empty query", () => {
      const results = filterTimezones("");
      expect(results).to.have.lengthOf(25);
    });
  });
});
