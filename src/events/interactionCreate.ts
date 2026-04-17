import { MessageFlags } from "discord.js";

import type { Client, Interaction, CommandInteraction } from "discord.js";

import logger from "../utils/logger.js";

import help from "../commands/help.js";
import about from "../commands/about.js";
import changelog from "../commands/changelog.js";
import quote from "../commands/quote.js";
import suggestion from "../commands/suggestion.js";
import invite from "../commands/invite.js";
import admin from "../commands/admin/index.js";
import setup, { setupAutocomplete } from "../commands/setup/index.js";
import premium from "../commands/premium.js";
import owner from "../commands/owner/index.js";

export async function interactionCreateEvent(
  client: Client,
  interaction: Interaction
): Promise<void> {
  try {
    if (interaction.isAutocomplete()) {
      if (interaction.commandName === "setup") {
        await setupAutocomplete(interaction);
      }
      return;
    }

    if (!interaction.isCommand()) {
      return;
    }

    const { commandName } = interaction;
    if (!commandName) {return;}

    switch (commandName) {
      case "help":
        await help.execute(client, interaction);
        break;
      case "about":
        await about.execute(client, interaction);
        break;
      case "changelog":
        await changelog.execute(client, interaction);
        break;
      case "quote":
        if (interaction.isChatInputCommand()) {await quote.execute(client, interaction);}
        break;
      case "invite":
        await invite.execute(client, interaction);
        break;
      case "suggestion":
        if (interaction.isChatInputCommand()) {await suggestion.execute(client, interaction);}
        break;
      case "admin":
        await admin.execute(client, interaction);
        break;
      case "setup":
        await setup.execute(client, interaction);
        break;
      case "premium":
        await premium.execute(client, interaction);
        break;
      case "owner":
        await owner.execute(client, interaction);
        break;
      default:
        logger.commands.warn(
          "interactionCreate",
          interaction.user.username,
          interaction.user.id,
          "Command not found"
        );
    }
  } catch (err) {
    const cmd = interaction.isCommand() ? interaction.commandName : "unknown";
    const interactionId = "id" in interaction ? interaction.id : undefined;
    const guildId = "guildId" in interaction ? interaction.guildId : null;

    logger.error("Discord - Command", "Error executing command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: cmd,
      interactionId,
      guildId,
    });

    try {
      const errInteraction = interaction as CommandInteraction;
      if (errInteraction.replied || errInteraction.deferred) {
        await errInteraction.followUp({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      } else {
        await errInteraction.reply({
          content: "There was an error while executing this command!",
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (replyErr) {
      logger.error("Discord - Command", "Failed to send error response to user", replyErr, {
        interactionId,
        guildId,
      });
    }
  }
}
