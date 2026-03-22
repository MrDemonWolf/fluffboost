import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockEnv } from "../../../helpers.js";

describe("admin suggestion list command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: { env?: Record<string, unknown> } = {}) {
    const logger = mockLogger();
    const db = mockDb();
    const env = mockEnv(overrides.env);

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db }));
    mock.module("../../../../src/utils/env.js", () => ({ default: env }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().returns(true) }));

    const mod = await import("../../../../src/commands/admin/suggestion/list.js");

    return { handler: mod.default, logger, db };
  }

  async function loadModuleUnauthorized() {
    const logger = mockLogger();
    const db = mockDb();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db }));
    mock.module("../../../../src/utils/env.js", () => ({ default: mockEnv() }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().returns(false) }));

    const mod = await import("../../../../src/commands/admin/suggestion/list.js");

    return { handler: mod.default, logger, db };
  }

  function makeInteraction(status: string | null = null) {
    const interaction = mockInteraction();
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("status").returns(status);
    return interaction;
  }

  it("should deny unauthorized users", async () => {
    const { handler, db } = await loadModuleUnauthorized();
    const interaction = makeInteraction();

    await handler({} as never, interaction as never, interaction.options as never);

    expect(db.select.called).toBe(false);
  });

  it("should return message when no suggestions found", async () => {
    const { handler } = await loadModule();
    const interaction = makeInteraction();

    // Default mockDb already returns empty array for select
    await handler({} as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("No suggestions found");
  });

  it("should filter by status when provided", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction("Pending");

    // The source builds the chain: db.select().from().orderBy() then conditionally .where()
    // With our mock, select returns a chain, and .where() is called on it
    const chain = mockDbChain([]);
    db.select.returns(chain);

    await handler({} as never, interaction as never, interaction.options as never);

    expect(db.select.calledOnce).toBe(true);
    // The where method should have been called (for status filter)
    expect((chain.where as sinon.SinonStub).called).toBe(true);
  });

  it("should return suggestions as a text file", async () => {
    const { handler, db } = await loadModule();
    const interaction = makeInteraction();

    db.select.returns(mockDbChain([
      { id: "s1", quote: "Be kind", author: "Anon", status: "Pending", addedBy: "user-1" },
      { id: "s2", quote: "Stay strong", author: "Me", status: "Approved", addedBy: "user-2" },
    ]));

    await handler({} as never, interaction as never, interaction.options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.files).toHaveLength(1);
    expect(replyArgs.files[0].name).toBe("suggestions.txt");

    const content = replyArgs.files[0].attachment.toString();
    expect(content).toContain("s1");
    expect(content).toContain("Be kind");
    expect(content).toContain("s2");
    expect(content).toContain("Stay strong");
  });
});
