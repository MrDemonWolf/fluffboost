import type { Client, CommandInteraction } from "discord.js";

import { SlashCommandBuilder, OAuth2Scopes } from "discord.js";

import { info, success, error } from "../utils/commandLogger";
import posthog from "../utils/posthog";

export const slashCommand = new SlashCommandBuilder()
  .setName("invite")
  .setDescription(
    "Invite me to your server! Let's keep spreading paw-sitivity 🐾"
  );

export function execute(client: Client, interaction: CommandInteraction) {
  try {
    info("invite", interaction.user.username, interaction.user.id);

    // generate invite link
    const inviteLink = client.generateInvite({
      scopes: [OAuth2Scopes.ApplicationsCommands, OAuth2Scopes.Bot],
    });

    // send invite link
    interaction.reply({
      content: `Invite me to your server! Let's keep spreading paw-sitivity 🐾\n${inviteLink}`,
      ephemeral: true,
    });
    success("invite", interaction.user.username, interaction.user.id);
    posthog.capture({
      distinctId: interaction.user.id,
      event: "invite command used",
    });
  } catch (err) {
    error("invite", interaction.user.username, interaction.user.id);
    console.log(err);
  }
}

export default {
  slashCommand,
  execute,
};
