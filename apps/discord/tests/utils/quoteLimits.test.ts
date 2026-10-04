import { expect, it } from "bun:test";
import { EmbedBuilder } from "discord.js";
import { quoteInputError } from "../../src/utils/quoteLimits.js";
import { buildBrandedEmbed } from "../../src/utils/embedHelpers.js";

it("permits boundary-length quote fields that Discord can serialize", () => {
  expect(quoteInputError("x".repeat(1024), "a".repeat(256))).toBeNull();
  expect(() => new EmbedBuilder().addFields({ name: "Quote", value: "x".repeat(1024) }).toJSON()).not.toThrow();
});
it("rejects oversized and whitespace-only quotes before persistence", () => {
  expect(quoteInputError("x".repeat(1025), "Anon")).toContain("1024");
  expect(quoteInputError("Be kind", "a".repeat(257))).toContain("256");
  expect(quoteInputError("  ", "Anon")).not.toBeNull();
});
it("safely serializes legacy long quote fields and rejection reasons", () => {
  const embed = buildBrandedEmbed({ fields: [{ name: "Quote", value: "x".repeat(5000) }] });
  expect(embed.toJSON().fields![0]!.value.length).toBe(1024);
});
