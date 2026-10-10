import { SlashCommandBuilder, MessageFlags } from "discord.js";

import type { Client, ChatInputCommandInteraction } from "discord.js";

import { requireOwner, requireTestEnvironment } from "../../utils/ownerGuard.js";

/**
 * Import subcommands
 */
import premiumTestCreate from "./premium/testCreate.js";
import premiumTestDelete from "./premium/testDelete.js";
import premiumTestList from "./premium/testList.js";

export const slashCommand = new SlashCommandBuilder()
  .setName("owner")
  .setDescription("Bot owner commands")
  .addSubcommandGroup((subCommandGroup) => {
    return subCommandGroup
      .setName("premium")
      .setDescription("Manage premium test entitlements")
      .addSubcommand((subCommand) => {
        return subCommand
          .setName("test-create")
          .setDescription("Create a test entitlement for a server")
          .addStringOption((option) =>
            option
              .setName("guild")
              .setDescription("Guild ID (defaults to current server)")
              .setRequired(false)
          );
      })
      .addSubcommand((subCommand) => {
        return subCommand
          .setName("test-delete")
          .setDescription("Delete a test entitlement")
          .addStringOption((option) =>
            option
              .setName("entitlement_id")
              .setDescription("The entitlement ID to delete")
              .setRequired(true)
          );
      })
      .addSubcommand((subCommand) => {
        return subCommand
          .setName("test-list")
          .setDescription("List all entitlements (test grants marked)");
      });
  });

type OwnerSubcommand = (client: Client, interaction: ChatInputCommandInteraction) => Promise<void>;

/** Handlers keyed by "<group> <subcommand>", matching the builder above. */
export const ownerRoutes: ReadonlyMap<string, OwnerSubcommand> = new Map([
  ["premium test-create", premiumTestCreate],
  ["premium test-delete", premiumTestDelete],
  ["premium test-list", premiumTestList],
]);

/**
 * Subcommands carry their own withCommandLogging wrapper and guards; errors
 * thrown by the router itself are answered by the interactionCreate router.
 */
export async function execute(client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
  if (!(await requireOwner(interaction, "owner"))) {
    return;
  }
  if (!(await requireTestEnvironment(interaction))) {
    return;
  }

  const group = interaction.options.getSubcommandGroup();
  const subcommand = interaction.options.getSubcommand();
  const handler = ownerRoutes.get(`${group} ${subcommand}`);

  if (!handler) {
    await interaction.reply({
      content: "Invalid subcommand",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await handler(client, interaction);
}

export default {
  slashCommand,
  execute,
};
