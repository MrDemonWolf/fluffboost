import type { Client, CommandInteraction } from "discord.js";

import { SlashCommandBuilder, EmbedBuilder } from "discord.js";

import { info, success, error } from "../utils/commandLogger";
import posthog from "../utils/posthog";

export const slashCommand = new SlashCommandBuilder()
  .setName("changelog")
  .setDescription("See the latest changes to the bot");

export function execute(client: Client, interaction: CommandInteraction) {
  try {
    info("changelog", interaction.user.username, interaction.user.id);

    const embed = new EmbedBuilder()
      .setColor(0xfadb7f)
      .setTitle("Changelog")
      .setDescription("Here are the latest changes to the bot:")
      .addFields(
        {
          name: "Posthg Integration",
          value:
            "Added Posthog integration for user tracking to get insights on how the bot is being used.",
        },
        {
          name: "New Command",
          value: "`/suggestion` - Suggest a quote to be added to the bot",
        },
        {
          name: "Version Update",
          value: "Updated to version 1.4.0",
        }
      )
      .setTimestamp()
      .setFooter({
        text: "Powered by MrDemonWolf, Inc.",
      });

    interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
    success("changelog", interaction.user.username, interaction.user.id);
    posthog.capture({
      distinctId: interaction.user.id,
      event: "changelog command used",
      properties: {
        environment: process.env.NODE_ENV,
        userId: interaction.user.id,
        username: interaction.user.username,
      },
    });
  } catch (err) {
    error("changelog", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}

export default {
  slashCommand,
  execute,
};
