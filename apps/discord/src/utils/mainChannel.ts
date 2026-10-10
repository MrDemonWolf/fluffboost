import type { Client, EmbedBuilder } from "discord.js";

import env from "./env.js";
import logger from "./logger.js";

/**
 * Fetch the configured main channel and send content to it.
 * Handles the channel fetch and text-based type guard. MAIN_CHANNEL_ID is
 * required by the env schema, so no presence check is needed here.
 *
 * allowUnknownGuild: under sharding only the shard that owns MAIN_GUILD_ID has
 * that guild cached; without it, discord.js discards the fetched channel on
 * every other shard and the announcement is silently dropped. The channel is
 * then uncached (one GET per announcement) and has no `guild`, which is fine
 * because only isTextBased/isDMBased/send are used.
 */
export async function sendToMainChannel(
  client: Client,
  content: { embeds: EmbedBuilder[] } | string
): Promise<void> {
  const channel = await client.channels.fetch(env.MAIN_CHANNEL_ID, { allowUnknownGuild: true });
  if (channel?.isTextBased() && !channel.isDMBased()) {
    await channel.send(content);
  } else {
    logger.warn("Admin", "Main channel not found or not text-based", {
      channelId: env.MAIN_CHANNEL_ID,
    });
  }
}

/**
 * Best-effort announce to the main channel. Swallows any failure into a
 * `logger.warn` — used after a command has already committed its DB write and
 * replied to the user, so a channel-send failure must never fail the command.
 */
export async function announceToMainChannel(
  client: Client,
  content: { embeds: EmbedBuilder[] } | string,
  warnMessage: string,
  logContext?: Record<string, unknown>
): Promise<void> {
  try {
    await sendToMainChannel(client, content);
  } catch (err) {
    logger.warn("Discord - Command", warnMessage, { ...logContext, error: err });
  }
}
