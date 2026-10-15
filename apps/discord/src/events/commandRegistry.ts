/**
 * The one list of top-level slash commands. Both interaction routing (interactionCreate.ts) and Discord
 * registration (ready.ts) derive from it, so the two can never disagree.
 */
import type { Client, ChatInputCommandInteraction } from "discord.js";

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
import env from "../utils/env.js";
import { allowsTestEntitlements } from "../utils/entitlementPolicy.js";

/**
 * Signature every top-level command's `execute` satisfies. Every command is a
 * chat-input (slash) command; the router narrows with isChatInputCommand()
 * once, so handlers never re-check or cast.
 */
export type CommandHandler = (
  client: Client,
  interaction: ChatInputCommandInteraction
) => Promise<unknown>;

/** The /owner premium test tools are never registered or routed in production. */
const ownerEnabled = allowsTestEntitlements(env.NODE_ENV);

/**
 * The single list of commands, in Discord registration order. Routing and
 * registration are both derived from it, so a command cannot be registered
 * without being routed (or the reverse).
 */
const commands = [
  help,
  about,
  quote,
  suggestion,
  invite,
  setup,
  admin,
  changelog,
  premium,
  ...(ownerEnabled ? [owner] : []),
];

/**
 * Command registry keyed by slash-command name. The event router imports this
 * single object, so router tests mock one module instead of every command.
 */
export const commandRegistry: Readonly<Record<string, { execute: CommandHandler }>> = Object.fromEntries(
  commands.map((command) => [command.slashCommand.name, { execute: command.execute as CommandHandler }])
);

/** /setup's autocomplete handler (schedule timezones), re-exported so router tests can mock it here too. */
export const setupAutocomplete = _setupAutocomplete;

/** All slash-command definitions for Discord API registration. */
export const slashCommands = commands.map((command) => command.slashCommand);
