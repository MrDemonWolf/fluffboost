import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockDb, mockDbChain, mockClient } from "../helpers.js";

describe("quoteHelpers", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function load(db: ReturnType<typeof mockDb>) {
    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    return import("../../src/utils/quoteHelpers.js");
  }

  it("getRandomMotivationQuote returns null when table is empty", async () => {
    const db = mockDb();
    db.select.returns(mockDbChain([]));
    const { getRandomMotivationQuote } = await load(db);

    const result = await getRandomMotivationQuote();
    expect(result).toBeNull();
  });

  it("getRandomMotivationQuote returns first row when present", async () => {
    const db = mockDb();
    const row = { id: "q1", quote: "hi", author: "a", addedBy: "u", createdAt: new Date() };
    db.select.returns(mockDbChain([row]));
    const { getRandomMotivationQuote } = await load(db);

    const result = await getRandomMotivationQuote();
    expect(result).toEqual(row);
  });

  it("resolveQuoteAuthor returns null on fetch failure", async () => {
    const db = mockDb();
    const { resolveQuoteAuthor } = await load(db);
    const client = mockClient();
    (client.users.fetch as sinon.SinonStub).rejects(new Error("Unknown user"));

    const result = await resolveQuoteAuthor(client as never, "missing");
    expect(result).toBeNull();
  });

  it("buildMotivationEmbed returns a fresh EmbedBuilder each call", async () => {
    const db = mockDb();
    const { buildMotivationEmbed } = await load(db);
    const client = mockClient();
    const quote = { id: "q1", quote: "hi", author: "a", addedBy: "u", createdAt: new Date() };

    const a = buildMotivationEmbed(quote, null, client as never);
    const b = buildMotivationEmbed(quote, null, client as never);
    expect(a).not.toBe(b);
    expect(a.data.title).toContain("Motivation");
  });
});
