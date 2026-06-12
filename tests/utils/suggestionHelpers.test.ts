import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockDb, mockDbChain, mockInteraction, mockClient, mockEnv, mockLogger } from "../helpers.js";

describe("suggestionHelpers.fetchPendingSuggestion", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function load(rows: unknown[]) {
    const db = mockDb();
    db.select.returns(mockDbChain(rows));
    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    // suggestionHelpers pulls in mainChannel → env/logger; keep them mocked so
    // the real env validation never runs under test.
    mock.module("../../src/utils/env.js", () => ({ default: mockEnv() }));
    mock.module("../../src/utils/logger.js", () => ({ default: mockLogger() }));
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

describe("suggestionHelpers.notifySuggestionReviewed", () => {
  afterEach(() => {
    sinon.restore();
  });

  const suggestion = { id: "s1", status: "Approved", quote: "q", author: "a", addedBy: "u1" };
  const reviewer = { username: "admin", displayAvatarURL: () => "https://x/a.png" };

  async function loadNotify() {
    const logger = mockLogger();
    mock.module("../../src/database/index.js", () => ({ db: mockDb(), queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/env.js", () => ({ default: mockEnv() }));
    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    const mod = await import("../../src/utils/suggestionHelpers.js");
    return { notifySuggestionReviewed: mod.notifySuggestionReviewed, logger };
  }

  function makeClient() {
    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const submitter = { send: sinon.stub().resolves() };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);
    (client.users.fetch as sinon.SinonStub).resolves(submitter);
    return { client, channel, submitter };
  }

  it("posts the review embed to the main channel and DMs the submitter", async () => {
    const { notifySuggestionReviewed } = await loadNotify();
    const { client, channel, submitter } = makeClient();

    await notifySuggestionReviewed(client as never, {
      status: "Approved",
      suggestion: suggestion as never,
      suggestionId: "s1",
      reviewer: reviewer as never,
    });

    expect(channel.send.calledOnce).toBe(true);
    expect(submitter.send.calledOnce).toBe(true);
  });

  it("includes the reason in the rejection DM when provided", async () => {
    const { notifySuggestionReviewed } = await loadNotify();
    const { client, submitter } = makeClient();

    await notifySuggestionReviewed(client as never, {
      status: "Rejected",
      suggestion: suggestion as never,
      suggestionId: "s1",
      reviewer: reviewer as never,
      reason: "duplicate",
    });

    expect(submitter.send.calledOnce).toBe(true);
    const dmPayload = submitter.send.getCall(0).args[0];
    const description = dmPayload.embeds[0].data.description as string;
    expect(description).toContain("Reason");
    expect(description).toContain("duplicate");
  });

  it("swallows and warns on main-channel failure, still attempting the DM", async () => {
    const { notifySuggestionReviewed, logger } = await loadNotify();
    const { client, submitter } = makeClient();
    (client.channels.fetch as sinon.SinonStub).rejects(new Error("Unknown Channel"));

    await notifySuggestionReviewed(client as never, {
      status: "Approved",
      suggestion: suggestion as never,
      suggestionId: "s1",
      reviewer: reviewer as never,
    });

    expect(logger.warn.called).toBe(true);
    expect(submitter.send.calledOnce).toBe(true);
  });

  it("swallows and warns on DM failure", async () => {
    const { notifySuggestionReviewed, logger } = await loadNotify();
    const { client, channel } = makeClient();
    (client.users.fetch as sinon.SinonStub).rejects(new Error("Cannot send DM"));

    await notifySuggestionReviewed(client as never, {
      status: "Approved",
      suggestion: suggestion as never,
      suggestionId: "s1",
      reviewer: reviewer as never,
    });

    expect(channel.send.calledOnce).toBe(true);
    expect(logger.warn.called).toBe(true);
  });
});
