import { MessageFlags } from "discord.js";

import type {
  Client,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";

import { eq } from "drizzle-orm";

import { withCommandLogging } from "../../utils/commandErrors.js";
import { db } from "../../database/index.js";
import { guilds } from "../../database/schema.js";
import { guildExists } from "../../utils/guildDatabase.js";

export default async function (
  _client: Client,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await withCommandLogging("setup channel", interaction, async () => {
    if (!interaction.guildId) {
      return;
    }

    const motivationChannel = interaction.options.getChannel(
      "channel",
      true
    ) as TextChannel;

    await guildExists(interaction.guildId);

    await db
      .update(guilds)
      .set({ motivationChannelId: motivationChannel.id })
      .where(eq(guilds.guildId, interaction.guildId));

    await interaction.reply({
      content: `The motivation channel has been set to <#${motivationChannel.id}>`,
      flags: MessageFlags.Ephemeral,
    });
  });
}
