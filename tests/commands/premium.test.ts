import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockPosthog, mockClient, mockInteraction, mockEnv } from "../helpers.js";

describe("premium command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: { premiumEnabled?: boolean; skuId?: string; hasEntitlement?: boolean } = {}) {
    const logger = mockLogger();
    const posthog = mockPosthog();
    const env = mockEnv({
      PREMIUM_ENABLED: overrides.premiumEnabled ?? false,
      DISCORD_PREMIUM_SKU_ID: overrides.skuId,
    });

    const mod = await esmock("../../src/commands/premium.js", {
      "../../src/utils/logger.js": { default: logger },
      "../../src/utils/posthog.js": { default: posthog },
      "../../src/utils/premium.js": {
        isPremiumEnabled: sinon.stub().returns(overrides.premiumEnabled ?? false),
        hasEntitlement: sinon.stub().returns(overrides.hasEntitlement ?? false),
        getPremiumSkuId: sinon.stub().returns(overrides.skuId),
      },
    });

    return { execute: mod.execute, logger, posthog };
  }

  it("should show unavailable message when premium is disabled", async () => {
    const { execute } = await loadModule({ premiumEnabled: false });
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("not currently available");
  });

  it("should show upsell embed when premium enabled but no entitlement", async () => {
    const { execute } = await loadModule({ premiumEnabled: true, skuId: "sku-1", hasEntitlement: false });
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.embeds).to.be.an("array").with.lengthOf(1);
    expect(replyArgs.embeds[0].data.title).to.equal("FluffBoost Premium");
  });

  it("should show active embed when premium enabled and has entitlement", async () => {
    const { execute } = await loadModule({ premiumEnabled: true, skuId: "sku-1", hasEntitlement: true });
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.embeds).to.be.an("array").with.lengthOf(1);
    expect(replyArgs.embeds[0].data.title).to.equal("Premium Active");
  });

  it("should include purchase button in upsell when SKU is configured", async () => {
    const { execute } = await loadModule({ premiumEnabled: true, skuId: "sku-1", hasEntitlement: false });
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.components).to.be.an("array").with.lengthOf(1);
  });

  it("should reply with ephemeral messages", async () => {
    const { execute } = await loadModule({ premiumEnabled: false });
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.flags).to.exist;
  });

  it("should capture posthog event", async () => {
    const { execute, posthog } = await loadModule({ premiumEnabled: true, skuId: "sku-1" });
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect(posthog.capture.calledOnce).to.be.true;
    expect(posthog.capture.firstCall.args[0].event).to.equal("premium command used");
  });
});
