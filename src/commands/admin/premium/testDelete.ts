import { MessageFlags } from "discord.js";

import type { Client, CommandInteraction, CommandInteractionOptionResolver } from "discord.js";

import logger from "../../../utils/logger.js";
import { isUserPermitted } from "../../../utils/permissions.js";

export default async function (
  client: Client,
  interaction: CommandInteraction,
  options: CommandInteractionOptionResolver
): Promise<void> {
  try {
    logger.commands.executing(
      "admin premium test-delete",
      interaction.user.username,
      interaction.user.id
    );

    const isAllowed = isUserPermitted(interaction);
    if (!isAllowed) return;

    const entitlementId = options.getString("entitlement_id", true);

    await client.application!.entitlements.deleteTest(entitlementId);

    await interaction.reply({
      content: `Test entitlement \`${entitlementId}\` deleted.`,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "admin premium test-delete",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    logger.commands.error(
      "admin premium test-delete",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error(
      "Discord - Command",
      "Error executing admin premium test-delete command",
      err,
      {
        user: { username: interaction.user.username, id: interaction.user.id },
        command: "admin premium test-delete",
      }
    );

    if (!interaction.replied) {
      await interaction.reply({
        content: "Failed to delete test entitlement. Check bot logs for details.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
