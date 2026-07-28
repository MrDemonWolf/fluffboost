import type { Client, EmbedBuilder } from "discord.js";

import env from "./env.js";
import logger from "./logger.js";

/**
 * Fetch the configured main channel and send content to it.
 * Handles the MAIN_CHANNEL_ID check, channel fetch, and text-based type guard.
 */
export async function sendToMainChannel(
  client: Client,
  content: { embeds: EmbedBuilder[] } | string
): Promise<void> {
  if (!env.MAIN_CHANNEL_ID) {
    logger.warn("Admin", "MAIN_CHANNEL_ID not configured");
    return;
  }

  const channel = await client.channels.fetch(env.MAIN_CHANNEL_ID);
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
