import { SlashCommandBuilder } from "discord.js";

import type { Client, CommandInteraction } from "discord.js";

import env from "../utils/env.js";
import logger from "../utils/logger.js";
import { withCommandLogging } from "../utils/commandErrors.js";
import { buildBrandedEmbed } from "../utils/embedHelpers.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("about")
  .setDescription("Learn more about the bot and its creator");

/**
 * Per-shard cache only holds this shard's guilds, so sum across shards. The
 * broadcast rejects while any shard is spawning or respawning; fall back to
 * this shard's count rather than failing the command.
 */
async function countGuilds(client: Client): Promise<string> {
  if (!client.shard) {
    return `${client.guilds.cache.size}`;
  }
  try {
    // broadcastEval keeps the per-shard result typed (fetchClientValues yields unknown[]).
    const sizes = await client.shard.broadcastEval((shardClient) => shardClient.guilds.cache.size);
    const total = sizes.reduce((sum, size) => sum + size, 0);
    return `${total}`;
  } catch (err) {
    logger.warn("Discord - Command", "Cross-shard guild count unavailable; using this shard's count", {
      error: err,
    });
    return `at least ${client.guilds.cache.size}`;
  }
}

export async function execute(client: Client, interaction: CommandInteraction): Promise<void> {
  await withCommandLogging("about", interaction, async () => {
    await interaction.deferReply();
    const username = client.user?.username ?? "FluffBoost";

    const guildCount = await countGuilds(client);

    const embed = buildBrandedEmbed({
      title: `About ${username} 🐾`,
      description: `Hi! I'm ${username}, a furry-friendly Discord bot by MrDemonWolf, Inc. I bring scheduled quotes and a little encouragement to your pack. I'm currently in ${guildCount} servers.`,
      fields: [
        {
          name: "Documentation",
          value: "[Guide](https://mrdemonwolf.github.io/fluffboost/docs/)",
          inline: true,
        },
        {
          name: "Project GitHub",
          value: "[GitHub](https://www.github.com/mrdemonwolf/fluffboost)",
          inline: true,
        },
        {
          name: "Status Page",
          value: "[Status](https://status.mrdemonwolf.com)",
          inline: true,
        },
        {
          name: "Creator Website",
          value: "[Website](https://www.mrdemonwolf.com)",
          inline: true,
        },
        {
          name: "Creator Discord",
          value: "[Discord](https://mrdwolf.net/discord)",
          inline: true,
        },
        {
          name: "Version",
          value: env.VERSION,
          inline: true,
        },
      ],
      footer: "Made with ❤️ by MrDemonWolf, Inc.",
    });

    await interaction.editReply({ embeds: [embed] });
  });
}

export default {
  slashCommand,
  execute,
};
