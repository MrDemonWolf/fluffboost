import { MessageFlags } from "discord.js";

import type { Client, CommandInteraction, CommandInteractionOptionResolver } from "discord.js";

import logger from "../../../utils/logger.js";
import { requireOwner } from "../../../utils/ownerGuard.js";
import { safeErrorReply } from "../../../utils/commandErrors.js";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
): Promise<void> {
  try {
    logger.commands.executing(
      "owner premium test-delete",
      interaction.user.username,
      interaction.user.id
    );

    if (!(await requireOwner(interaction, "owner premium test-delete"))) {
      return;
    }

    const entitlementId = options.getString("entitlement_id", true);

    if (!client.application) {
      await interaction.reply({
        content: "Bot application is not ready. Please try again in a moment.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await client.application.entitlements.deleteTest(entitlementId);

    await interaction.reply({
      content: `Test entitlement \`${entitlementId}\` deleted.`,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "owner premium test-delete",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    logger.commands.error(
      "owner premium test-delete",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error(
      "Discord - Command",
      "Error executing owner premium test-delete command",
      err,
      {
        user: { username: interaction.user.username, id: interaction.user.id },
        command: "owner premium test-delete",
      }
    );

    await safeErrorReply(interaction, "Failed to delete test entitlement. Check bot logs for details.");
  }
}
