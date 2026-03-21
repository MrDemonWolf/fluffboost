import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockEnv, mockInteraction, mockClient } from "../../../helpers.js";

describe("owner premium test-list command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(envOverrides: Record<string, unknown> = {}) {
    const logger = mockLogger();
    const env = mockEnv(envOverrides);

    mock.module("../../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../../src/utils/env.js", () => ({ default: env }));

    const mod = await import("../../../../src/commands/owner/premium/testList.js");

    return { testList: mod.default, logger, env };
  }

  it("should reject non-owner users", async () => {
    const { testList } = await loadModule({ OWNER_ID: "owner-123" });

    const interaction = mockInteraction({ user: { id: "not-owner", username: "hacker" } });
    await testList(mockClient() as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Only the bot owner");
  });

  it("should reply when application is not ready", async () => {
    const { testList } = await loadModule({ OWNER_ID: "owner-123" });

    const interaction = mockInteraction({ user: { id: "owner-123", username: "owner" } });
    const client = mockClient({ application: null });
    await testList(client as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("not ready");
  });

  it("should reply with no entitlements when list is empty", async () => {
    const { testList } = await loadModule({ OWNER_ID: "owner-123" });

    const interaction = mockInteraction({ user: { id: "owner-123", username: "owner" } });
    const client = mockClient();
    await testList(client as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("No entitlements found");
  });

  it("should list entitlements successfully", async () => {
    const { testList } = await loadModule({ OWNER_ID: "owner-123" });

    const interaction = mockInteraction({ user: { id: "owner-123", username: "owner" } });
    const client = mockClient();

    const fakeEntitlements = new Map([
      [
        "ent-1",
        { id: "ent-1", guildId: "guild-1", skuId: "sku-1", isTest: sinon.stub().returns(true) },
      ],
      [
        "ent-2",
        { id: "ent-2", guildId: null, skuId: "sku-2", isTest: sinon.stub().returns(false) },
      ],
    ]);
    (
      client.application as { entitlements: { fetch: sinon.SinonStub } }
    ).entitlements.fetch.resolves(fakeEntitlements);

    await testList(client as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Entitlements (2)");
    expect(replyArgs.content).toContain("ent-1");
    expect(replyArgs.content).toContain("guild-1");
    expect(replyArgs.content).toContain("ent-2");
    expect(replyArgs.content).toContain("*(test)*");
  });

  it("should truncate entitlements that exceed Discord 2000-char limit", async () => {
    const { testList } = await loadModule({ OWNER_ID: "owner-123" });

    const interaction = mockInteraction({ user: { id: "owner-123", username: "owner" } });
    const client = mockClient();

    const entries: [string, { id: string; guildId: string; skuId: string; isTest: sinon.SinonStub }][] = [];
    for (let i = 0; i < 50; i++) {
      const id = `entitlement-${"x".repeat(40)}-${i.toString().padStart(3, "0")}`;
      entries.push([id, { id, guildId: `guild-${i}`, skuId: `sku-${i}`, isTest: sinon.stub().returns(false) }]);
    }
    const fakeEntitlements = new Map(entries);
    (
      client.application as { entitlements: { fetch: sinon.SinonStub } }
    ).entitlements.fetch.resolves(fakeEntitlements);

    await testList(client as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content.length).toBeLessThanOrEqual(2000);
    expect(replyArgs.content).toContain("Entitlements (50)");
    expect(replyArgs.content).toContain("...and");
    expect(replyArgs.content).toContain("more");
  });

  it("should handle errors and reply with failure message", async () => {
    const { testList } = await loadModule({ OWNER_ID: "owner-123" });

    const interaction = mockInteraction({ user: { id: "owner-123", username: "owner" } });
    const client = mockClient();
    (
      client.application as { entitlements: { fetch: sinon.SinonStub } }
    ).entitlements.fetch.rejects(new Error("API failure"));

    await testList(client as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Failed to list entitlements");
  });
});
