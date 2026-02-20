import { SlashCommandBuilder, OAuth2Scopes, MessageFlags } from "discord.js";

import type { Client, CommandInteraction } from "discord.js";

import logger from "../utils/logger.js";
import posthog from "../utils/posthog.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("invite")
  .setDescription(
    "Invite me to your server! Let's keep spreading paw-sitivity 🐾"
  );

export async function execute(client: Client, interaction: CommandInteraction) {
  try {
    logger.commands.executing(
      "invite",
      interaction.user.username,
      interaction.user.id
    );

    // generate invite link
    const inviteLink = client.generateInvite({
      scopes: [OAuth2Scopes.ApplicationsCommands, OAuth2Scopes.Bot],
    });

    // send invite link
    await interaction.reply({
      content: `Invite me to your server! Let's keep spreading paw-sitivity 🐾\n${inviteLink}`,
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success(
      "invite",
      interaction.user.username,
      interaction.user.id
    );

    posthog.capture({
      distinctId: interaction.user.id,
      event: "invite command used",
      properties: {
        environment: process.env["NODE_ENV"],
        userId: interaction.user.id,
        username: interaction.user.username,
      },
    });
  } catch (err) {
    logger.commands.error(
      "invite",
      interaction.user.username,
      interaction.user.id,
      err
    );
    logger.error("Discord - Command", "Error executing invite command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "invite",
    });

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "An error occurred while processing your request.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}

export default {
  slashCommand,
  execute,
};
