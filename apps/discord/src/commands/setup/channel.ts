import { MessageFlags, PermissionFlagsBits } from "discord.js";

import type {
  Client,
  ChatInputCommandInteraction,
  TextChannel,
} from "discord.js";

import { eq } from "drizzle-orm";

import { withCommandLogging } from "../../utils/commandErrors.js";
import { requireGuildId } from "../../utils/permissions.js";
import { db } from "../../database/index.js";
import { guilds } from "../../database/schema.js";
import { guildExists } from "../../utils/guildDatabase.js";

export default async function (
  client: Client,
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await withCommandLogging("setup channel", interaction, async () => {
    const guildId = await requireGuildId(interaction);
    if (!guildId) {
      return;
    }

    const selectedChannel = interaction.options.getChannel(
      "channel",
      true
    );
    const motivationChannel = await client.channels.fetch(selectedChannel.id) as TextChannel | null;
    const permissions = client.user && motivationChannel?.permissionsFor(client.user);
    if (!motivationChannel || !motivationChannel.isTextBased() || motivationChannel.isDMBased() ||
      motivationChannel.guildId !== guildId || !permissions?.has([
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks,
      ])) {
      await interaction.reply({
        content: "Choose a channel in this server where FluffBoost has View Channel, Send Messages, and Embed Links permissions.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await guildExists(guildId);

    await db
      .update(guilds)
      .set({ motivationChannelId: motivationChannel.id })
      .where(eq(guilds.guildId, guildId));

    await interaction.reply({
      content: `The motivation channel has been set to <#${motivationChannel.id}>`,
      flags: MessageFlags.Ephemeral,
    });
  });
}
