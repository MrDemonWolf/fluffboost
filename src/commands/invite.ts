import { SlashCommandBuilder, OAuth2Scopes, MessageFlags } from "discord.js";

import type { Client, CommandInteraction } from "discord.js";

import { withCommandLogging } from "../utils/commandErrors.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("invite")
  .setDescription(
    "Invite me to your server! Let's keep spreading paw-sitivity 🐾"
  );

export async function execute(client: Client, interaction: CommandInteraction): Promise<void> {
  await withCommandLogging("invite", interaction, async () => {
    const inviteLink = client.generateInvite({
      scopes: [OAuth2Scopes.ApplicationsCommands, OAuth2Scopes.Bot],
    });

    await interaction.reply({
      content: `Invite me to your server! Let's keep spreading paw-sitivity 🐾\n${inviteLink}`,
      flags: MessageFlags.Ephemeral,
    });
  });
}

export default {
  slashCommand,
  execute,
};
