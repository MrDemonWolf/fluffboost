import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockDb, mockDbChain, mockInteraction, mockEnv } from "../../../helpers.js";

describe("admin suggestion stats command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(permitted = true) {
    const logger = mockLogger();
    const db = mockDb();

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/database/index.js", () => ({ db }));
    mock.module("../../../../src/utils/env.js", () => ({ default: mockEnv(), envSchema: {} }));
    mock.module("../../../../src/utils/permissions.js", () => ({ isUserPermitted: sinon.stub().resolves(permitted) }));

    const mod = await import("../../../../src/commands/admin/suggestion/stats.js");

    return { handler: mod.default, logger, db };
  }

  it("should deny unauthorized users", async () => {
    const { handler, db } = await loadModule(false);
    const interaction = mockInteraction();

    await handler({} as never, interaction as never);

    expect(db.select.called).toBe(false);
  });

  it("should return correct counts embed", async () => {
    const { handler, db } = await loadModule();
    const interaction = mockInteraction();

    // The source calls countByStatus 3 times via Promise.all, each does:
    // db.select({ value: count() }).from(table).where(...)
    // Returns [{ value: N }]
    db.select.onCall(0).returns(mockDbChain([{ value: 5 }]));  // Pending
    db.select.onCall(1).returns(mockDbChain([{ value: 10 }])); // Approved
    db.select.onCall(2).returns(mockDbChain([{ value: 3 }]));  // Rejected

    await handler({} as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    const embed = replyArgs.embeds[0];

    expect(embed.data.title).toBe("Suggestion Statistics");

    const fields = embed.data.fields;
    expect(fields[0].value).toBe("5");   // Pending
    expect(fields[1].value).toBe("10");  // Approved
    expect(fields[2].value).toBe("3");   // Rejected
    expect(fields[3].value).toBe("18");  // Total
    expect(fields[4].value).toBe("56%"); // Approval rate (10/18)
  });

  it("should handle zero suggestions", async () => {
    const { handler, db } = await loadModule();
    const interaction = mockInteraction();

    // All three count queries return 0
    db.select.returns(mockDbChain([{ value: 0 }]));

    await handler({} as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    const fields = replyArgs.embeds[0].data.fields;
    expect(fields[4].value).toBe("0%"); // 0% approval rate when no suggestions
  });
});
