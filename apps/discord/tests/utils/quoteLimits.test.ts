import { expect, it } from "bun:test";
import { EmbedBuilder } from "discord.js";
import { isUuid, quoteInputError } from "../../src/utils/quoteLimits.js";
import { buildBrandedEmbed, escapeFieldValue } from "../../src/utils/embedHelpers.js";

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
it("recognizes Postgres UUIDs and rejects truncated or padded IDs", () => {
  const id = "3F2B8C1E-4d5a-4b6c-8d7e-9f0a1b2c3d4e";
  expect(isUuid(id)).toBe(true);
  expect(isUuid(id.slice(0, -1))).toBe(false);
  expect(isUuid(`${id}0`)).toBe(false);
  expect(isUuid(` ${id}`)).toBe(false);
  expect(isUuid("")).toBe(false);
});
it("escapes markdown and masked links for staff-facing fields, truncating after escaping", () => {
  expect(escapeFieldValue("[Claim](https://phish.example)")).toBe("\\[Claim](https://phish.example)");
  expect(escapeFieldValue("# Heading")).toBe("\\# Heading");
  expect(escapeFieldValue("_".repeat(1024)).length).toBe(1024);
});
