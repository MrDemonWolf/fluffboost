import { MessageFlags } from "discord.js";

import type { Client, CommandInteraction } from "discord.js";

import logger from "../../../utils/logger.js";
import { requireOwner } from "../../../utils/ownerGuard.js";
import { safeErrorReply } from "../../../utils/commandErrors.js";

export default async function (client: Client, interaction: CommandInteraction): Promise<void> {
  try {
    logger.commands.executing(
      "owner premium test-list",
      interaction.user.username,
      interaction.user.id
    );

    if (!(await requireOwner(interaction, "owner premium test-list"))) {
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

    const header = `**Entitlements (${entitlements.size}):**\n`;
    const maxLength = 2000 - header.length;
    const truncatedLines: string[] = [];
    let currentLength = 0;

    for (const line of lines) {
      const addition = (truncatedLines.length > 0 ? "\n" : "") + line;
      if (currentLength + addition.length > maxLength) {
        const remaining = lines.length - truncatedLines.length;
        truncatedLines.push(`\n...and ${remaining} more`);
        break;
      }
      truncatedLines.push(line);
      currentLength += addition.length;
    }

    await interaction.reply({
      content: `${header}${truncatedLines.join("\n")}`,
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

    await safeErrorReply(interaction, "Failed to list entitlements. Check bot logs for details.");
  }
}
