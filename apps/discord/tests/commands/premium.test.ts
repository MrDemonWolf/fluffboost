import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockClient, mockInteraction, mockEnv, stubBuildPremiumUpsell } from "../helpers.js";

describe("premium command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: { premiumEnabled?: boolean; skuId?: string; hasEntitlement?: boolean } = {}) {
    const logger = mockLogger();
    const env = mockEnv({
      PREMIUM_ENABLED: overrides.premiumEnabled ?? false,
      DISCORD_PREMIUM_SKU_ID: overrides.skuId,
    });

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/premium.js", () => ({
      isPremiumEnabled: sinon.stub().returns(overrides.premiumEnabled ?? false),
      hasEntitlement: sinon.stub().returns(overrides.hasEntitlement ?? false),
      getPremiumSkuId: sinon.stub().returns(overrides.skuId),
      buildPremiumUpsell: stubBuildPremiumUpsell(overrides.skuId),
    }));

    const mod = await import("../../src/commands/premium.js");

    return { execute: mod.execute, logger };
  }

  it("should show unavailable message when premium is disabled", async () => {
    const { execute } = await loadModule({ premiumEnabled: false });
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("not currently available");
  });

  it("should show upsell embed when premium enabled but no entitlement", async () => {
    const { execute } = await loadModule({ premiumEnabled: true, skuId: "sku-1", hasEntitlement: false });
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(Array.isArray(replyArgs.embeds)).toBe(true);
    expect(replyArgs.embeds).toHaveLength(1);
    expect(replyArgs.embeds[0].data.title).toBe("FluffBoost Premium");
  });

  it("should show active embed when premium enabled and has entitlement", async () => {
    const { execute } = await loadModule({ premiumEnabled: true, skuId: "sku-1", hasEntitlement: true });
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(Array.isArray(replyArgs.embeds)).toBe(true);
    expect(replyArgs.embeds).toHaveLength(1);
    expect(replyArgs.embeds[0].data.title).toBe("Premium Active");
  });

  it("should include purchase button in upsell when SKU is configured", async () => {
    const { execute } = await loadModule({ premiumEnabled: true, skuId: "sku-1", hasEntitlement: false });
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(Array.isArray(replyArgs.components)).toBe(true);
    expect(replyArgs.components).toHaveLength(1);
  });

  it("should reply with ephemeral messages", async () => {
    const { execute } = await loadModule({ premiumEnabled: false });
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.flags).toBeDefined();
  });

});
