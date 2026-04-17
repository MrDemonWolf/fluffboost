import { MessageFlags } from "discord.js";

import type { CommandInteraction, ChatInputCommandInteraction } from "discord.js";

import logger from "./logger.js";

/**
 * Safely reply with an ephemeral error message if the interaction
 * hasn't already been replied to or deferred.
 */
export async function safeErrorReply(
  interaction: CommandInteraction | ChatInputCommandInteraction,
  message = "An error occurred while processing your request."
): Promise<void> {
  if (!interaction.replied && !interaction.deferred) {
    await interaction.reply({
      content: message,
      flags: MessageFlags.Ephemeral,
    });
  }
}

/**
 * Single entry point for logging a command error.
 * Replaces the duplicated pair of `logger.commands.error` + `logger.error` calls
 * scattered across catch blocks.
 */
export function logCommandError(
  commandName: string,
  interaction: CommandInteraction | ChatInputCommandInteraction,
  err: unknown
): void {
  logger.commands.error(
    commandName,
    interaction.user.username,
    interaction.user.id,
    err,
    interaction.guildId ?? undefined
  );
}

/**
 * Wrap a command handler with the standard executing/success/error/safeErrorReply
 * lifecycle so individual handlers don't repeat boilerplate.
 */
export async function withCommandLogging(
  commandName: string,
  interaction: CommandInteraction | ChatInputCommandInteraction,
  handler: () => Promise<void>,
  errorMessage?: string
): Promise<void> {
  logger.commands.executing(
    commandName,
    interaction.user.username,
    interaction.user.id,
    interaction.guildId ?? undefined
  );

  try {
    await handler();
    logger.commands.success(
      commandName,
      interaction.user.username,
      interaction.user.id,
      interaction.guildId ?? undefined
    );
  } catch (err) {
    logCommandError(commandName, interaction, err);
    await safeErrorReply(interaction, errorMessage);
  }
}
