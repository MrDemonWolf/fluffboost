import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { InteractionContextType, MessageFlags } from "discord.js";
import { mockLogger, mockClient, mockInteraction, mockDb, mockDbChain, stubBuildPremiumUpsell } from "../helpers.js";

describe("premium command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(overrides: { premiumEnabled?: boolean; skuId?: string; hasEntitlement?: boolean } = {}) {
    const logger = mockLogger();

    const db = mockDb();

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/database/index.js", () => ({ db, queryClient: () => Promise.resolve([]) }));
    mock.module("../../src/utils/premium.js", () => ({
      isPremiumEnabled: sinon.stub().returns(overrides.premiumEnabled ?? false),
      hasEntitlement: sinon.stub().returns(overrides.hasEntitlement ?? false),
      getPremiumSkuId: sinon.stub().returns(overrides.skuId),
      buildPremiumUpsell: stubBuildPremiumUpsell(overrides.skuId),
    }));

    const mod = await import("../../src/commands/premium.js");

    return { execute: mod.execute, logger, db };
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

  it("self-heals the cached isPremium flag when the entitlement is active", async () => {
    const { execute, db } = await loadModule({ premiumEnabled: true, skuId: "sku-1", hasEntitlement: true });
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect(db.update.calledOnce).toBe(true);
    const chain = db.update.firstCall.returnValue as Record<string, sinon.SinonStub>;
    expect(chain["set"]!.firstCall.args[0]).toEqual({ isPremium: true });
  });

  it("still shows Premium Active when the self-heal write fails", async () => {
    const { execute, db, logger } = await loadModule({ premiumEnabled: true, skuId: "sku-1", hasEntitlement: true });
    db.update.callsFake(() => mockDbChain().rejects(new Error("db down")));
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    expect((interaction.reply as sinon.SinonStub).firstCall.args[0].embeds[0].data.title).toBe("Premium Active");
    expect(logger.commands.error.calledOnce).toBe(true);
  });

  it("never writes isPremium without an entitlement or while Premium is disabled", async () => {
    for (const overrides of [
      { premiumEnabled: true, skuId: "sku-1", hasEntitlement: false },
      { premiumEnabled: false, hasEntitlement: true },
    ]) {
      const { execute, db } = await loadModule(overrides);
      await execute(mockClient() as never, mockInteraction() as never);
      expect(db.update.called).toBe(false);
    }
  });

  it("should include purchase button in upsell when SKU is configured", async () => {
    const { execute } = await loadModule({ premiumEnabled: true, skuId: "sku-1", hasEntitlement: false });
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(Array.isArray(replyArgs.components)).toBe(true);
    expect(replyArgs.components).toHaveLength(1);
  });

  it("is registered for server contexts only", async () => {
    await loadModule({ premiumEnabled: true });
    const { slashCommand } = await import("../../src/commands/premium.js");
    expect(slashCommand.toJSON().contexts).toEqual([InteractionContextType.Guild]);
  });

  it("explains it is server-only instead of upselling in a DM", async () => {
    const { execute } = await loadModule({ premiumEnabled: true, skuId: "sku-1", hasEntitlement: false });
    const interaction = mockInteraction({ guildId: null });

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("only be used in a server");
    expect(replyArgs.embeds).toBeUndefined();
  });

  it("replies ephemerally in the disabled, upsell and active states", async () => {
    for (const overrides of [
      { premiumEnabled: false },
      { premiumEnabled: true, skuId: "sku-1", hasEntitlement: false },
      { premiumEnabled: true, skuId: "sku-1", hasEntitlement: true },
    ]) {
      const { execute } = await loadModule(overrides);
      const interaction = mockInteraction();

      await execute(mockClient() as never, interaction as never);

      const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
      expect(replyArgs.flags).toBe(MessageFlags.Ephemeral);
    }
  });
});
