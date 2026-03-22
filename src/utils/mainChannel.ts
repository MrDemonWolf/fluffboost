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
    if (typeof content === "string") {
      await channel.send(content);
    } else {
      await channel.send(content);
    }
  } else {
    logger.warn("Admin", "Main channel not found or not text-based", {
      channelId: env.MAIN_CHANNEL_ID,
    });
  }
}
