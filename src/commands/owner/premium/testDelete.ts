import { MessageFlags } from "discord.js";

import type { Client, CommandInteraction, CommandInteractionOptionResolver } from "discord.js";

import logger from "../../../utils/logger.js";
import env from "../../../utils/env.js";

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

    if (interaction.user.id !== env.OWNER_ID) {
      logger.commands.unauthorized(
        "owner premium test-delete",
        interaction.user.username,
        interaction.user.id
      );
      await interaction.reply({
        content: "Only the bot owner can use this command.",
        flags: MessageFlags.Ephemeral,
      });
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

    if (!interaction.replied) {
      await interaction.reply({
        content: "Failed to delete test entitlement. Check bot logs for details.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
