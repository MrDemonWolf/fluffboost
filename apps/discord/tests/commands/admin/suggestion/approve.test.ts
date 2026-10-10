import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockPermissions } from "../../permissionsMock.js";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockClient, mockEnv } from "../../../helpers.js";

const SUGGESTION_ID = "1e2d3c4b-5a69-4788-9a0b-c1d2e3f4a5b6";

describe("admin suggestion approve command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(permitted = true) {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../../../src/utils/env.js", () => ({ default: env }));
    await mockPermissions(permitted);

    const mod = await import("../../../../src/commands/admin/suggestion/approve.js");

    return { handler: mod.default, logger, db, env };
  }

  function makeInteraction(suggestionId: string) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("suggestion_id", true).returns(suggestionId);
    return interaction;
  }

  function makeClient() {
    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const submitter = {
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);
    (client.users.fetch as sinon.SinonStub).resolves(submitter);
    return { client, channel, submitter };
  }

  function pendingRow(overrides: Record<string, unknown> = {}) {
    return {
      id: SUGGESTION_ID,
      quote: "Be kind",
      author: "Anon",
      addedBy: "user-1",
      status: "Pending",
      ...overrides,
    };
  }

  /** Run the transaction against a fresh tx mock whose claim UPDATE returns `claimedRows`. */
  function stubTransaction(db: ReturnType<typeof mockDb>, claimedRows: unknown[]) {
    const holder: { tx?: ReturnType<typeof mockDb> } = {};
    db.transaction.callsFake(async (fn: (tx: ReturnType<typeof mockDb>) => Promise<unknown>) => {
      holder.tx = mockDb();
      holder.tx.update.returns(mockDbChain(claimedRows));
      return fn(holder.tx);
    });
    return holder;
  }

  it("denies unauthorized users before any database access", async () => {
    const { handler, db } = await loadModule(false);
    const { client, channel, submitter } = makeClient();
    const interaction = makeInteraction(SUGGESTION_ID);

    await handler(client as never, interaction as never);

    expect(db.select.called).toBe(false);
    expect(db.transaction.called).toBe(false);
    expect(channel.send.called).toBe(false);
    expect(submitter.send.called).toBe(false);
  });

  it("should return error when suggestion not found", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction(SUGGESTION_ID);

    // select().from().where().limit(1) returns empty -> destructures to undefined
    db.select.returns(mockDbChain([]));

    await handler({} as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("not found");
  });

  it("should return error when already approved", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction(SUGGESTION_ID);

    db.select.returns(mockDbChain([pendingRow({ status: "Approved" })]));

    await handler({} as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("already been approved");
  });

  it("refuses a legacy suggestion that exceeds the quote length limit", async () => {
    const { handler, db } = await loadModule();
    const { client, channel } = makeClient();
    const interaction = makeInteraction(SUGGESTION_ID);

    db.select.returns(mockDbChain([pendingRow({ quote: "x".repeat(5000) })]));

    await handler(client as never, interaction as never);

    expect(db.transaction.called).toBe(false);
    expect(channel.send.called).toBe(false);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Reject this suggestion instead");
  });

  it("should approve suggestion successfully", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction(SUGGESTION_ID);
    const { client, channel, submitter } = makeClient();

    db.select.returns(mockDbChain([pendingRow()]));
    // The conditional UPDATE must report a row was claimed (status was still
    // Pending) for approve to proceed.
    const holder = stubTransaction(db, [{ id: SUGGESTION_ID }]);

    await handler(client as never, interaction as never);

    expect(db.transaction.calledOnce).toBe(true);
    // Inside transaction: update (claim Pending suggestion) and insert (motivation quote)
    expect(holder.tx!.insert.calledOnce).toBe(true);
    expect(holder.tx!.update.calledOnce).toBe(true);
    expect(channel.send.calledOnce).toBe(true);
    expect(submitter.send.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("approved");
  });

  it("inserts nothing and notifies no one when a concurrent review claimed the row first", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction(SUGGESTION_ID);
    const { client, channel, submitter } = makeClient();

    db.select.returns(mockDbChain([pendingRow()]));
    // Zero rows: another admin rejected (or approved) between the read and the claim.
    const holder = stubTransaction(db, []);

    await handler(client as never, interaction as never);

    expect(holder.tx!.update.calledOnce).toBe(true);
    expect(holder.tx!.insert.called).toBe(false);
    expect(channel.send.called).toBe(false);
    expect(submitter.send.called).toBe(false);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("no longer pending");
  });

  it("should not break if DM fails", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction(SUGGESTION_ID);
    const { client } = makeClient();

    db.select.returns(mockDbChain([pendingRow()]));
    stubTransaction(db, [{ id: SUGGESTION_ID }]);

    // Make user fetch throw to simulate DMs disabled
    (client.users.fetch as sinon.SinonStub).rejects(new Error("Cannot send DM"));

    await handler(client as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("approved");
  });

  it("should not break if the main-channel announcement fails", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction(SUGGESTION_ID);
    const { client } = makeClient();

    db.select.returns(mockDbChain([pendingRow()]));
    stubTransaction(db, [{ id: SUGGESTION_ID }]);

    // Symmetric to the DM-failure case: the main-channel announce is
    // best-effort, so a deleted/unfetchable channel must not fail the command.
    (client.channels.fetch as sinon.SinonStub).rejects(new Error("Unknown Channel"));

    await handler(client as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("approved");
  });
});
