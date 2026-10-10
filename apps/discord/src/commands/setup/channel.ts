import { ChannelType, MessageFlags, PermissionFlagsBits } from "discord.js";

import type { Client, ChatInputCommandInteraction } from "discord.js";

import { eq } from "drizzle-orm";

import { withCommandLogging } from "../../utils/commandErrors.js";
import { requireGuildAdministrator, requireGuildId } from "../../utils/permissions.js";
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
    if (!(await requireGuildAdministrator(interaction))) {
      return;
    }

    const selectedChannel = interaction.options.getChannel(
      "channel",
      true
    );
    const motivationChannel = await client.channels.fetch(selectedChannel.id);
    // Narrow on the runtime channel type (the option only offers text
    // channels, but a stale command definition could pass anything).
    const isUsable = motivationChannel?.type === ChannelType.GuildText &&
      motivationChannel.guildId === guildId &&
      client.user !== null &&
      motivationChannel.permissionsFor(client.user)?.has([
        PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks,
      ]) === true;
    if (!motivationChannel || !isUsable) {
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
