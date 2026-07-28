import { SlashCommandBuilder } from "discord.js";

import type { Client, CommandInteraction } from "discord.js";

import env from "../utils/env.js";
import { withCommandLogging } from "../utils/commandErrors.js";
import { buildBrandedEmbed } from "../utils/embedHelpers.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("about")
  .setDescription("Learn more about the bot and its creator");

export async function execute(client: Client, interaction: CommandInteraction): Promise<void> {
  await withCommandLogging("about", interaction, async () => {
    const username = client.user?.username ?? "FluffBoost";

    // Per-shard cache only holds this shard's guilds; sum across shards.
    const guildCount = client.shard
      ? (await client.shard.fetchClientValues("guilds.cache.size")).reduce(
          (total: number, size) => total + (size as number),
          0
        )
      : client.guilds.cache.size;

    const embed = buildBrandedEmbed({
      title: `About ${username} 🐾`,
      description: `Hi! I'm ${username}, a discord bot created by MrDemonWolf, Inc. I was created to help you with your daily tasks and to make your life easier. I'm currently in ${guildCount} guilds.`,
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
          value: "[Discord](https://l.mrdemonwolf.com/discord)",
          inline: true,
        },
        {
          name: "Version",
          value: env.VERSION || process.env["npm_package_version"] || "unknown",
          inline: true,
        },
      ],
      footer: "Made with ❤️ by MrDemonWolf, Inc.",
    });

    await interaction.reply({ embeds: [embed] });
  });
}

export default {
  slashCommand,
  execute,
};
