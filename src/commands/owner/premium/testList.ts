import { MessageFlags } from "discord.js";

import type { Client, CommandInteraction } from "discord.js";

import { requireApplication, requireOwner } from "../../../utils/ownerGuard.js";
import { withCommandLogging } from "../../../utils/commandErrors.js";

export default async function (client: Client, interaction: CommandInteraction): Promise<void> {
  await withCommandLogging(
    "owner premium test-list",
    interaction,
    async () => {
      if (!(await requireOwner(interaction, "owner premium test-list"))) {return;}
      const application = await requireApplication(client, interaction);
      if (!application) {return;}

      const entitlements = await application.entitlements.fetch();

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
      // Reserve headroom for the "\n...and N more" overflow marker so the
      // final payload can't exceed Discord's 2000-char limit.
      const OVERFLOW_RESERVE = 32;
      const maxLength = 2000 - header.length - OVERFLOW_RESERVE;
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
    },
    "Failed to list entitlements. Check bot logs for details."
  );
}
