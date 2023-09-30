import type {
  SlashCommandSubcommandGroupBuilder,
  SlashCommandSubcommandBuilder,
  Client,
  CommandInteraction,
} from "discord.js";

import { SlashCommandBuilder } from "discord.js";

import { info, error } from "../../utils/commandLogger";

/**
 * Import subcommands
 */

export const slashCommand = new SlashCommandBuilder();
