import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

import type { Client, CommandInteraction, User } from "discord.js";

import env from "../utils/env";
import logger from "../utils/logger";
import posthog from "../utils/posthog";

export const slashCommand = new SlashCommandBuilder()
  .setName("about")
  .setDescription("Learn more about the bot and its creator");

export async function execute(client: Client, interaction: CommandInteraction) {
  try {
    logger.commands.executing(
      "about",
      interaction.user.username,
      interaction.user.id
    );

    const { username } = client.user as User;

    const embed = new EmbedBuilder()
      .setColor(0xfadb7f)
      .setTitle(`About ${username} 🐾`)
      .setDescription(
        `Hi! I'm ${username}, a discord bot created by MrDemonWolf, Inc. I was created to help you with your daily tasks and to make your life easier. I'm currently in ${client.guilds.cache.size} guilds.`
      )
      .addFields(
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
          value: "[Website](https://www.mrdmeonwolf.com)",
          inline: true,
        },
        {
          name: "Creator Discord",
          value: "[Discord](https://l.mrdemonwolf.com/discord)",
          inline: true,
        },
        {
          name: "Version",
          value: env.VERSION || process.env.npm_package_version || "unknown",
          inline: true,
        }
      )
      .setFooter({
        text: "Made with ❤️ by MrDemonWolf, Inc.",
      });
    await interaction.reply({
      embeds: [embed],
    });

    logger.commands.success(
      "about",
      interaction.user.username,
      interaction.user.id
    );

    posthog.capture({
      distinctId: interaction.user.id,
      event: "about command used",
      properties: {
        environment: process.env.NODE_ENV,
        userId: interaction.user.id,
        username: interaction.user.username,
      },
    });
  } catch (err) {
    logger.commands.error(
      "about",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error("Discord - Command", "Error executing about command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "about",
    });
  }
}

export default {
  slashCommand,
  execute,
};
