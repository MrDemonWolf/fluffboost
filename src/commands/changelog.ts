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
      content: `Version 1.0.0 (Released on Oct 17, 2023)
        Fixed Quotes.
        Fixed an issue where motivational quotes were posted twice.
        Added a Simple Express /status route.
        Edited the Quote List Command.
        Added a Help Command.
        Added an Invite Command.
        Updated the About Command.`,
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
