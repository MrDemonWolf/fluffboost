import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import { mockLogger, mockEnv, mockInteraction, mockClient } from "../../../helpers.js";

describe("owner premium test-delete command", () => {
  afterEach(() => {
    sinon.restore();
  });

  async function loadModule(envOverrides: Record<string, unknown> = {}) {
    const logger = mockLogger();
    const env = mockEnv(envOverrides);

    const mod = await esmock("../../../../src/commands/owner/premium/testDelete.js", {
      "../../../../src/utils/logger.js": { default: logger },
      "../../../../src/utils/env.js": { default: env },
    });

    return { handler: mod.default, logger, env };
  }

  function makeInteraction(userId: string, entitlementId: string) {
    const interaction = mockInteraction({
      user: { id: userId, username: "testuser", displayAvatarURL: sinon.stub().returns("https://example.com/av.png") },
    });
    const getStringStub = interaction.options.getString as sinon.SinonStub;
    getStringStub.withArgs("entitlement_id", true).returns(entitlementId);
    return interaction;
  }

  it("should reject non-owner users", async () => {
    const { handler } = await loadModule({ OWNER_ID: "owner-123" });
    const interaction = makeInteraction("not-owner", "ent-1");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("Only the bot owner");
  });

  it("should delete test entitlement successfully", async () => {
    const { handler } = await loadModule({ OWNER_ID: "owner-123" });
    const interaction = makeInteraction("owner-123", "ent-1");
    const client = mockClient();

    await handler(client as never, interaction as never, interaction.options as never);

    expect(
      (client.application as { entitlements: { deleteTest: sinon.SinonStub } }).entitlements.deleteTest.calledOnce
    ).to.be.true;
    expect(
      (client.application as { entitlements: { deleteTest: sinon.SinonStub } }).entitlements.deleteTest.firstCall
        .args[0]
    ).to.equal("ent-1");
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("deleted");
  });

  it("should reply when application is not ready", async () => {
    const { handler } = await loadModule({ OWNER_ID: "owner-123" });
    const interaction = makeInteraction("owner-123", "ent-1");
    const client = mockClient();
    client.application = null as never;

    await handler(client as never, interaction as never, interaction.options as never);

    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("not ready");
  });

  it("should show error message on API failure", async () => {
    const { handler, logger } = await loadModule({ OWNER_ID: "owner-123" });
    const interaction = makeInteraction("owner-123", "ent-1");
    const client = mockClient();
    (client.application as { entitlements: { deleteTest: sinon.SinonStub } }).entitlements.deleteTest.rejects(
      new Error("API Error: rate limited")
    );

    await handler(client as never, interaction as never, interaction.options as never);

    expect(logger.commands.error.calledOnce).to.be.true;
    const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
    expect(replyArgs.content).to.include("API Error: rate limited");
  });

  it("should log unauthorized access attempt", async () => {
    const { handler, logger } = await loadModule({ OWNER_ID: "owner-123" });
    const interaction = makeInteraction("not-owner", "ent-1");

    await handler(mockClient() as never, interaction as never, interaction.options as never);

    expect(logger.commands.unauthorized.calledOnce).to.be.true;
  });
});
