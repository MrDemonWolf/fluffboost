import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockEnv, mockInteraction, mockClient } from "../../helpers.js";

describe("owner premium test-create command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(envOverrides: Record<string, unknown> = {}) {
    const logger = mockLogger();
    const env = mockEnv(envOverrides);

    mock.module("../../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../../src/utils/env.js", () => ({ default: env }));
    // Provide every premium export: mock.module is process-global, and other
    // modules loaded later in the same run (e.g. /help) import more of them.
    mock.module("../../../src/utils/premium.js", () => ({
      getPremiumSkuId: sinon.stub().returns(env.DISCORD_PREMIUM_SKU_ID),
      isPremiumEnabled: sinon.stub().returns(env.PREMIUM_ENABLED),
      hasEntitlement: sinon.stub().returns(false),
      buildPremiumUpsell: sinon.stub().returns({ embeds: [], components: [] }),
    }));

    const mod = await import("../../../src/commands/owner/premium/testCreate.js");

    return { testCreate: mod.default, logger, env };
  }

  it("should create guild-level test entitlement successfully", async () => {
    const { testCreate } = await loadModule({
      OWNER_ID: "owner-123",
      DISCORD_PREMIUM_SKU_ID: "sku-1",
    });

    const interaction = mockInteraction({ user: { id: "owner-123", username: "owner" } });

    const client = mockClient();
    await testCreate(client as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Test entitlement created");
  });

  it("should use current guild when no guild option provided", async () => {
    const { testCreate } = await loadModule({
      OWNER_ID: "owner-123",
      DISCORD_PREMIUM_SKU_ID: "sku-1",
    });

    const interaction = mockInteraction({
      user: { id: "owner-123", username: "owner" },
      guildId: "current-guild-123",
    });

    const client = mockClient();
    await testCreate(client as never, interaction as never);

    const createTestCall = (
      client.application as { entitlements: { createTest: sinon.SinonStub } }
    ).entitlements.createTest;
    expect(createTestCall.calledOnce).toBe(true);
    expect(createTestCall.firstCall.args[0].guild).toBe("current-guild-123");
  });

  it("should reject non-owner users", async () => {
    const { testCreate } = await loadModule({
      OWNER_ID: "owner-123",
      DISCORD_PREMIUM_SKU_ID: "sku-1",
    });

    const interaction = mockInteraction({ user: { id: "not-owner", username: "hacker" } });

    await testCreate(mockClient() as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Only the bot owner");
  });

  it("passes the guild option through to the test entitlement", async () => {
    const { testCreate } = await loadModule({
      OWNER_ID: "owner-123",
      DISCORD_PREMIUM_SKU_ID: "sku-1",
    });

    const interaction = mockInteraction({ user: { id: "owner-123", username: "owner" } });
    (interaction.options.getString as sinon.SinonStub).withArgs("guild").returns("other-guild-1");

    const client = mockClient();
    await testCreate(client as never, interaction as never);

    const createTest = client.application.entitlements.createTest;
    expect(createTest.firstCall.args[0].guild).toBe("other-guild-1");
  });

  it("refuses the owner on the production bot without calling Discord", async () => {
    const { testCreate } = await loadModule({
      OWNER_ID: "owner-123",
      DISCORD_PREMIUM_SKU_ID: "sku-1",
      NODE_ENV: "production",
    });

    const interaction = mockInteraction({ user: { id: "owner-123", username: "owner" } });
    const client = mockClient();

    await testCreate(client as never, interaction as never);

    const createTest = client.application.entitlements.createTest;
    expect(createTest.called).toBe(false);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("disabled on the production bot");
  });

  it("should reject when no SKU configured", async () => {
    const { testCreate } = await loadModule({
      OWNER_ID: "owner-123",
      DISCORD_PREMIUM_SKU_ID: undefined,
    });

    const interaction = mockInteraction({ user: { id: "owner-123", username: "owner" } });

    await testCreate(mockClient() as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("DISCORD_PREMIUM_SKU_ID is not configured");
  });

  it("should reject when no guild context and no guild param", async () => {
    const { testCreate } = await loadModule({
      OWNER_ID: "owner-123",
      DISCORD_PREMIUM_SKU_ID: "sku-1",
    });

    const interaction = mockInteraction({
      user: { id: "owner-123", username: "owner" },
      guildId: null,
    });

    await testCreate(mockClient() as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Could not determine guild");
  });

  it("should reply with generic failure message and log error on failure", async () => {
    const { testCreate, logger } = await loadModule({
      OWNER_ID: "100000000000000999",
      DISCORD_PREMIUM_SKU_ID: "200000000000000001",
    });

    const interaction = mockInteraction({ user: { id: "100000000000000999", username: "owner" } });

    const client = mockClient();
    (
      client.application as { entitlements: { createTest: sinon.SinonStub } }
    ).entitlements.createTest.rejects(new Error("API Error: rate limited"));

    await testCreate(client as never, interaction as never);

    expect(logger.commands.error.called).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("Failed to create test entitlement");
  });
});
