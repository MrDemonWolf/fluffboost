import type { Client, ChatInputCommandInteraction, CommandInteraction } from "discord.js";

import help from "../commands/help.js";
import about from "../commands/about.js";
import changelog from "../commands/changelog.js";
import quote from "../commands/quote.js";
import suggestion from "../commands/suggestion.js";
import invite from "../commands/invite.js";
import admin from "../commands/admin/index.js";
import setup, { setupAutocomplete as _setupAutocomplete } from "../commands/setup/index.js";
import premium from "../commands/premium.js";
import owner from "../commands/owner/index.js";

/**
 * Command registry keyed by slash-command name. The event router imports this
 * single object, so tests can mock one module instead of ten — which avoids
 * cross-file `mock.module` leakage clobbering the real command modules used
 * by each command's own test file.
 */
export type CommandHandler = (
  client: Client,
  interaction: CommandInteraction | ChatInputCommandInteraction
) => Promise<unknown>;

export const commandRegistry: Record<string, { execute: CommandHandler; requiresChatInput?: boolean }> = {
  help: { execute: (c, i) => help.execute(c, i as CommandInteraction) },
  about: { execute: (c, i) => about.execute(c, i as CommandInteraction) },
  changelog: { execute: (c, i) => changelog.execute(c, i as CommandInteraction) },
  quote: { execute: (c, i) => quote.execute(c, i as ChatInputCommandInteraction), requiresChatInput: true },
  invite: { execute: (c, i) => invite.execute(c, i as CommandInteraction) },
  suggestion: { execute: (c, i) => suggestion.execute(c, i as ChatInputCommandInteraction), requiresChatInput: true },
  admin: { execute: (c, i) => admin.execute(c, i as CommandInteraction) },
  setup: { execute: (c, i) => setup.execute(c, i as CommandInteraction) },
  premium: { execute: (c, i) => premium.execute(c, i as CommandInteraction) },
  owner: { execute: (c, i) => owner.execute(c, i as CommandInteraction) },
};

export const setupAutocomplete = _setupAutocomplete;

/** All slash-command definitions for Discord API registration. */
export const slashCommands = [
  help.slashCommand,
  about.slashCommand,
  quote.slashCommand,
  suggestion.slashCommand,
  invite.slashCommand,
  setup.slashCommand,
  admin.slashCommand,
  changelog.slashCommand,
  premium.slashCommand,
  owner.slashCommand,
];
