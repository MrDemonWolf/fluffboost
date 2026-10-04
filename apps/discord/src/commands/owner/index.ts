import { SlashCommandBuilder, MessageFlags } from "discord.js";

import type {
  Client,
  CommandInteraction,
  CommandInteractionOptionResolver,
} from "discord.js";

import { requireOwner, requireTestEnvironment } from "../../utils/ownerGuard.js";
import { withCommandLogging } from "../../utils/commandErrors.js";

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
        return subCommand.setName("test-list").setDescription("List all entitlements");
      });
  });

export async function execute(client: Client, interaction: CommandInteraction) {
  if (!interaction.isChatInputCommand()) {
    return;
  }
  await withCommandLogging("owner", interaction, async () => {
    if (!(await requireOwner(interaction, "owner"))) {
      return;
    }
    if (!(await requireTestEnvironment(interaction))) {
      return;
    }

    const options = interaction.options;
    const subCommandGroup = options.getSubcommandGroup();
    const subCommand = options.getSubcommand();

    switch (subCommandGroup) {
      case "premium":
        switch (subCommand) {
          case "test-create":
            await premiumTestCreate(
              client,
              interaction,
              options as CommandInteractionOptionResolver
            );
            break;
          case "test-delete":
            await premiumTestDelete(
              client,
              interaction,
              options as CommandInteractionOptionResolver
            );
            break;
          case "test-list":
            await premiumTestList(client, interaction);
            break;
          default:
            await interaction.reply({
              content: "Invalid subcommand",
              flags: MessageFlags.Ephemeral,
            });
        }
        break;

      default:
        await interaction.reply({
          content: "Invalid subcommand group",
          flags: MessageFlags.Ephemeral,
        });
    }
  });
}

export default {
  slashCommand,
  execute,
};
