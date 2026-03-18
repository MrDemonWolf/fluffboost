import { MessageFlags } from "discord.js";

import type { Client, CommandInteraction } from "discord.js";

import logger from "../../../utils/logger.js";
import env from "../../../utils/env.js";

export default async function (client: Client, interaction: CommandInteraction): Promise<void> {
  try {
    logger.commands.executing(
      "owner premium test-list",
      interaction.user.username,
      interaction.user.id
    );

    if (interaction.user.id !== env.OWNER_ID) {
      logger.commands.unauthorized(
        "owner premium test-list",
        interaction.user.username,
        interaction.user.id
      );
      await interaction.reply({
        content: "Only the bot owner can use this command.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!client.application) {
      await interaction.reply({
        content: "Bot application is not ready. Please try again in a moment.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const entitlements = await client.application.entitlements.fetch();

    if (entitlements.size === 0) {
      await interaction.reply({
        content: "No entitlements found.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const lines = Array.from(entitlements.values()).map((e) => {
      const test = e.isTest() ? " *(test)*" : "";
      return `• \`${e.id}\` — guild: \`${e.guildId ?? "N/A"}\` — SKU: \`${e.skuId}\`${test}`;
    });

    await interaction.reply({
      content: `**Entitlements (${entitlements.size}):**\n${lines.join("\n")}`,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "owner premium test-list",
      interaction.user.username,
      interaction.user.id
    );
  } catch (err) {
    logger.commands.error(
      "owner premium test-list",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error(
      "Discord - Command",
      "Error executing owner premium test-list command",
      err,
      {
        user: { username: interaction.user.username, id: interaction.user.id },
        command: "owner premium test-list",
      }
    );

    if (!interaction.replied) {
      await interaction.reply({
        content: "Failed to list entitlements. Check bot logs for details.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
