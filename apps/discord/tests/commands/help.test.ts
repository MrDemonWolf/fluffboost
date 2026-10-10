import { describe, it, expect, afterEach, mock } from "bun:test";
import sinon from "sinon";
import { mockLogger, mockClient, mockEnv, mockInteraction, stubBuildPremiumUpsell } from "../helpers.js";
import type { MockEnv } from "../helpers.js";


describe("help command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(opts: { nodeEnv?: MockEnv["NODE_ENV"]; premiumEnabled?: boolean } = {}) {
    const logger = mockLogger();

    mock.module("../../src/utils/logger.js", () => ({ default: logger }));
    mock.module("../../src/utils/env.js", () => ({ default: mockEnv({ NODE_ENV: opts.nodeEnv ?? "test" }) }));
    mock.module("../../src/utils/premium.js", () => ({
      isPremiumEnabled: sinon.stub().returns(opts.premiumEnabled ?? true),
      hasEntitlement: sinon.stub().returns(false),
      getPremiumSkuId: sinon.stub().returns(undefined),
      buildPremiumUpsell: stubBuildPremiumUpsell(),
    }));

    const mod = await import("../../src/commands/help.js");

    return { execute: mod.execute, buildHelpText: mod.buildHelpText, logger };
  }

  it("should reply with command list", async () => {
    const { execute } = await loadModule();
    const interaction = mockInteraction();

    await execute(mockClient() as never, interaction as never);

    expect((interaction.reply as sinon.SinonStub).calledOnce).toBe(true);
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).toContain("/about");
    expect(replyArgs.content).toContain("/quote");
    expect(replyArgs.flags).toBeDefined();
  });

  it("lists every registered owner tool outside production", async () => {
    const { buildHelpText } = await loadModule({ nodeEnv: "development" });
    const text = buildHelpText();

    expect(text).toContain("/owner premium test-create");
    expect(text).toContain("/owner premium test-delete");
    expect(text).toContain("/owner premium test-list");
    // One command per line, with no leftover template indentation.
    expect(text.split("\n").every((line) => line === line.trimStart())).toBe(true);
  });

  it("omits the owner tools on the production bot, where they are not registered", async () => {
    const { buildHelpText } = await loadModule({ nodeEnv: "production" });

    expect(buildHelpText()).not.toContain("/owner");
  });

  it("only labels /setup schedule as premium while Premium is enabled", async () => {
    const enabled = await loadModule({ premiumEnabled: true });
    expect(enabled.buildHelpText()).toContain("Customize quote delivery schedule (premium)");

    const disabled = await loadModule({ premiumEnabled: false });
    expect(disabled.buildHelpText()).toContain("`/setup schedule` - Customize quote delivery schedule\n");
  });

  it("should reply with error on failure", async () => {
    const { execute, logger } = await loadModule();
    const interaction = mockInteraction();
    (interaction.reply as sinon.SinonStub).onFirstCall().rejects(new Error("fail"));
    (interaction.reply as sinon.SinonStub).onSecondCall().resolves();

    await execute(mockClient() as never, interaction as never);

    expect(logger.commands.error.calledOnce).toBe(true);
  });
});
