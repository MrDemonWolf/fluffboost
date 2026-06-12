import { describe, it, expect, beforeEach, mock } from "bun:test";
import { MessageFlags } from "discord.js";
import sinon from "sinon";
import { mockEnv, mockLogger, mockInteraction, mockClient } from "../helpers.js";

const env = mockEnv();
const logger = mockLogger();

mock.module("../../src/utils/env.js", () => ({ default: env }));
mock.module("../../src/utils/logger.js", () => ({ default: logger }));

const { requireOwner, requireApplication } = await import("../../src/utils/ownerGuard.js");

describe("ownerGuard", () => {
  beforeEach(() => {
    logger.commands.unauthorized.reset();
  });

  describe("requireOwner", () => {
    it("returns true for the configured owner and does not reply", async () => {
      const interaction = mockInteraction({
        user: { id: env.OWNER_ID, username: "owner", displayAvatarURL: sinon.stub() },
      });

      const result = await requireOwner(interaction as never, "owner premium test-create");

      expect(result).toBe(true);
      expect((interaction.reply as sinon.SinonStub).called).toBe(false);
      expect(logger.commands.unauthorized.called).toBe(false);
    });

    it("rejects non-owner users with an ephemeral reply and logs it", async () => {
      const interaction = mockInteraction(); // user-123, not the owner

      const result = await requireOwner(interaction as never, "owner premium test-create");

      expect(result).toBe(false);
      expect(logger.commands.unauthorized.calledOnce).toBe(true);
      const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
      expect(replyArgs.content).toContain("Only the bot owner");
      expect(replyArgs.flags).toBe(MessageFlags.Ephemeral);
    });
  });

  describe("requireApplication", () => {
    it("returns the application when ready", async () => {
      const client = mockClient();
      const interaction = mockInteraction();

      const result = await requireApplication(client as never, interaction as never);

      expect(result).toBe(client.application as never);
      expect((interaction.reply as sinon.SinonStub).called).toBe(false);
    });

    it("replies and returns null when the application is not ready", async () => {
      const client = mockClient({ application: null });
      const interaction = mockInteraction();

      const result = await requireApplication(client as never, interaction as never);

      expect(result).toBeNull();
      const replyArgs = (interaction.reply as sinon.SinonStub).firstCall.args[0];
      expect(replyArgs.content).toContain("not ready");
      expect(replyArgs.flags).toBe(MessageFlags.Ephemeral);
    });
  });
});
