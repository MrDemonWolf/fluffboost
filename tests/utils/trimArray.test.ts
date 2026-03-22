import { describe, it, expect } from "bun:test";
import { trimArray } from "../../src/utils/trimArray.js";

describe("trimArray", () => {
  it("should trim whitespace from array elements", () => {
    const result = trimArray(["  hello  ", " world "]);
    expect(result).toEqual(["hello", "world"]);
  });

  it("should handle an empty array", () => {
    const result = trimArray([]);
    expect(result).toEqual([]);
  });

  it("should handle already-trimmed strings", () => {
    const result = trimArray(["hello", "world"]);
    expect(result).toEqual(["hello", "world"]);
  });

  it("should handle mixed whitespace (tabs, spaces, newlines)", () => {
    const result = trimArray(["\thello\t", "\n world \n"]);
    expect(result).toEqual(["hello", "world"]);
  });
});
