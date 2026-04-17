import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockDb, mockDbChain, mockInteraction } from "../helpers.js";

describe("suggestionHelpers.fetchPendingSuggestion", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function load(rows: unknown[]) {
    const db = mockDb();
    db.select.returns(mockDbChain(rows));
    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    const mod = await import("../../src/utils/suggestionHelpers.js");
    return { fetchPendingSuggestion: mod.fetchPendingSuggestion };
  }

  it("returns null and replies when suggestion is missing", async () => {
    const { fetchPendingSuggestion } = await load([]);
    const interaction = mockInteraction();
    const result = await fetchPendingSuggestion("x", interaction as never);
    expect(result).toBeNull();
    const content = (interaction.reply as sinon.SinonStub).firstCall.args[0].content;
    expect(content).toContain("not found");
  });

  it("returns null and replies when suggestion is already reviewed", async () => {
    const { fetchPendingSuggestion } = await load([
      { id: "s1", status: "Approved", quote: "q", author: "a", addedBy: "u" },
    ]);
    const interaction = mockInteraction();
    const result = await fetchPendingSuggestion("s1", interaction as never);
    expect(result).toBeNull();
    const content = (interaction.reply as sinon.SinonStub).firstCall.args[0].content;
    expect(content).toContain("already been approved");
  });

  it("returns the suggestion when status is Pending", async () => {
    const suggestion = { id: "s1", status: "Pending", quote: "q", author: "a", addedBy: "u" };
    const { fetchPendingSuggestion } = await load([suggestion]);
    const interaction = mockInteraction();
    const result = await fetchPendingSuggestion("s1", interaction as never);
    expect(result).toEqual(suggestion);
    expect((interaction.reply as sinon.SinonStub).called).toBe(false);
  });
});
