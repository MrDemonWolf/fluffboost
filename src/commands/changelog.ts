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
      content: `**Version 1.0.0** (Released on Oct 17, 2023)\n- Fixed Quotes.\n- Fixed an issue where motivational quotes were posted twice.\n- Added a Simple Express \`/status\` route.\n- Edited the Quote List Command.\n- Added a Help Command.\n- Added an Invite Command.\n- Updated the About Command.`,
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
