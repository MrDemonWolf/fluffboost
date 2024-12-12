import type { Client, CommandInteraction } from "discord.js";

import { SlashCommandBuilder } from "discord.js";

import { info, success, error } from "../utils/commandLogger";

export const slashCommand = new SlashCommandBuilder()
  .setName("changelog")
  .setDescription("See the latest changes to the bot");

export function execute(client: Client, interaction: CommandInteraction) {
  try {
    info("changelog", interaction.user.username, interaction.user.id);
    interaction.reply({
      content: `**Version 1.1.1** (Released on Aug 21, 2024)\n- Remove Owner command.\n-Change icon`,
      ephemeral: true,
    });
    success("changelog", interaction.user.username, interaction.user.id);
  } catch (err) {
    error("changelog", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}

export default {
  slashCommand,
  execute,
};
