import { MessageFlags } from "discord.js";

import type { Client, ChatInputCommandInteraction } from "discord.js";

import { requireApplication, requireOwner, requireTestEnvironment } from "../../../utils/ownerGuard.js";
import { withCommandLogging } from "../../../utils/commandErrors.js";

export default async function (
  client: Client,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await withCommandLogging(
    "owner premium test-delete",
    interaction,
    async () => {
      if (!(await requireOwner(interaction, "owner premium test-delete"))) {return;}
      if (!(await requireTestEnvironment(interaction))) {return;}

      const entitlementId = interaction.options.getString("entitlement_id", true);

      const application = await requireApplication(client, interaction);
      if (!application) {return;}

      await application.entitlements.deleteTest(entitlementId);

      await interaction.reply({
        content: `Test entitlement \`${entitlementId}\` deleted.`,
        flags: MessageFlags.Ephemeral,
      });
    },
    "Failed to delete test entitlement. Check bot logs for details."
  );
}
