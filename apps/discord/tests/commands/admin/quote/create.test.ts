/**
 * Tests the /admin quote create subcommand (src/commands/admin/quote/create.ts) against a mocked Drizzle db.
 * Permissions come from mockPermissions(), whose stub never replies, so a denied run leaves `reply` unused.
 */
import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { ADMIN_DENIED_REPLY, NOT_ALLOWED_USER_ID, mockPermissions, useRealPermissions } from "../../permissionsMock.js";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockClient, mockEnv } from "../../../helpers.js";

describe("admin quote create command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule() {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../../../src/utils/env.js", () => ({ default: env }));
    await mockPermissions(true);

    const mod = await import("../../../../src/commands/admin/quote/create.js");

    return { handler: mod.default, logger, db, env };
  }

  async function loadModuleNotPermitted() {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../../../src/utils/env.js", () => ({ default: env }));
    // The real gate: the test user is not in mockEnv()'s ALLOWED_USERS.
    await useRealPermissions();

    const mod = await import("../../../../src/commands/admin/quote/create.js");

    return { handler: mod.default, logger, db, env };
  }

  function makeInteraction(quote: string, author: string, userId = "user-123") {
    const interaction = mockInteraction();
    interaction.user.id = userId;
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("quote").returns(quote);
    getStringStub.withArgs("quote_author").returns(author);
    return interaction;
  }

  it("denies a user outside ALLOWED_USERS with the gate's reply and writes nothing", async () => {
    const { handler, db } = await loadModuleNotPermitted();
    // Without the gate this input would insert and announce, so the test fails if the gate is removed.
    db.insert.returns(mockDbChain([{ id: "q1", quote: "Be kind", author: "Anon", addedBy: NOT_ALLOWED_USER_ID }]));
    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);
    const interaction = makeInteraction("Be kind", "Anon", NOT_ALLOWED_USER_ID);

    await handler(client as never, interaction as never);

    const reply = interaction.reply as sinon.SinonStub;
    expect(reply.calledOnce).toBe(true);
    expect(reply.firstCall.args[0].content).toBe(ADMIN_DENIED_REPLY);
    expect(db.insert.called).toBe(false);
    expect(channel.send.called).toBe(false);
  });

  it("rejects a whitespace-only quote without inserting", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction("   ", "Author");

    await handler(mockClient() as never, interaction as never);

    expect(db.insert.called).toBe(false);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Use a quote between 1 and");
  });

  it("rejects a whitespace-only author without inserting", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction("Be kind", " ");

    await handler(mockClient() as never, interaction as never);

    expect(db.insert.called).toBe(false);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Use an author between 1 and");
  });

  it("should create quote and reply on success", async () => {
    const { handler, db } = await loadModule();
    db.insert.returns(mockDbChain([{ id: "q1", quote: "Be kind", author: "Anon", addedBy: "user-123" }]));

    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const interaction = makeInteraction("Be kind", "Anon");
    await handler(client as never, interaction as never);

    expect(db.insert.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Quote created");
  });

  it("should send embed to main channel on success", async () => {
    const { handler, db } = await loadModule();
    db.insert.returns(mockDbChain([{ id: "q1", quote: "Be kind", author: "Anon", addedBy: "user-123" }]));

    const channel = {
      isTextBased: sinon.stub().returns(true),
      isDMBased: sinon.stub().returns(false),
      send: sinon.stub().resolves(),
    };
    const client = mockClient();
    (client.channels.fetch as sinon.SinonStub).resolves(channel);

    const interaction = makeInteraction("Be kind", "Anon");
    await handler(client as never, interaction as never);

    expect(channel.send.calledOnce).toBe(true);
    const sendArgs = channel.send.firstCall.args[0];
    expect(Array.isArray(sendArgs.embeds)).toBe(true);
    expect(sendArgs.embeds).toHaveLength(1);
  });

  it("should reply with error on database failure", async () => {
    const { handler, db, logger } = await loadModule();
    const chain = mockDbChain();
    chain.rejects(new Error("DB error"));
    db.insert.returns(chain);

    const interaction = makeInteraction("Be kind", "Anon");
    await handler(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("error occurred");
  });
});
