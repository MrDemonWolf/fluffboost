import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockEnv, mockInteraction, mockClient } from "../../helpers.js";

describe("owner premium test-create command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(envOverrides: Record<string, unknown> = {}) {
    const logger = mockLogger();
    const env = mockEnv(envOverrides);

    const mod = await esmock("../../../src/commands/owner/premium/testCreate.js", {
      "../../../src/utils/logger.js": { default: logger },
      "../../../src/utils/env.js": { default: env },
      "../../../src/utils/premium.js": {
        getPremiumSkuId: sinon.stub().returns(env.DISCORD_PREMIUM_SKU_ID),
      },
    });

    return { testCreate: mod.default, logger, env };
  }

  it("should create guild-level test entitlement successfully", async () => {
    const { testCreate } = await loadModule({
      OWNER_ID: "owner-123",
      DISCORD_PREMIUM_SKU_ID: "sku-1",
    });

    const interaction = mockInteraction({ user: { id: "owner-123", username: "owner" } });
    const options = {
      getString: sinon.stub().returns(null),
    };

    const client = mockClient();
    await testCreate(client as never, interaction as never, options as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("Test entitlement created");
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
    const options = { getString: sinon.stub().returns(null) };

    const client = mockClient();
    await testCreate(client as never, interaction as never, options as never);

    const createTestCall = (
      client.application as { entitlements: { createTest: sinon.SinonStub } }
    ).entitlements.createTest;
    expect(createTestCall.calledOnce).to.be.true;
    expect(createTestCall.firstCall.args[0].guild).to.equal("current-guild-123");
  });

  it("should reject non-owner users", async () => {
    const { testCreate } = await loadModule({
      OWNER_ID: "owner-123",
      DISCORD_PREMIUM_SKU_ID: "sku-1",
    });

    const interaction = mockInteraction({ user: { id: "not-owner", username: "hacker" } });
    const options = { getString: sinon.stub().returns(null) };

    await testCreate(mockClient() as never, interaction as never, options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("Only the bot owner");
  });

  it("should reject when no SKU configured", async () => {
    const { testCreate } = await loadModule({
      OWNER_ID: "owner-123",
      DISCORD_PREMIUM_SKU_ID: undefined,
    });

    const interaction = mockInteraction({ user: { id: "owner-123", username: "owner" } });
    const options = { getString: sinon.stub().returns(null) };

    await testCreate(mockClient() as never, interaction as never, options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("DISCORD_PREMIUM_SKU_ID is not configured");
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
    const options = { getString: sinon.stub().returns(null) };

    await testCreate(mockClient() as never, interaction as never, options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("Could not determine guild");
  });

  it("should show actual error on failure", async () => {
    const { testCreate } = await loadModule({
      OWNER_ID: "owner-123",
      DISCORD_PREMIUM_SKU_ID: "sku-1",
    });

    const interaction = mockInteraction({ user: { id: "owner-123", username: "owner" } });
    const options = { getString: sinon.stub().returns(null) };

    const client = mockClient();
    (
      client.application as { entitlements: { createTest: sinon.SinonStub } }
    ).entitlements.createTest.rejects(new Error("API Error: rate limited"));

    await testCreate(client as never, interaction as never, options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("API Error: rate limited");
  });
});
