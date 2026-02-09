import { EmbedBuilder, MessageFlags } from "discord.js";
import type { Client, ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";

import logger from "../../utils/logger.js";
import { prisma } from "../../database/index.js";
import { guildExists } from "../../utils/guildDatabase.js";
import { hasEntitlement, isPremiumEnabled, getPremiumSkuId } from "../../utils/premium.js";
import { isValidTimezone, filterTimezones } from "../../utils/timezones.js";
import type { MotivationFrequency } from "../../generated/prisma/client.js";

const DAY_OF_WEEK_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatScheduleDescription(frequency: string, time: string, timezone: string, day: number | null): string {
  const parts = [`**Frequency:** ${frequency}`, `**Time:** ${time}`, `**Timezone:** ${timezone}`];

  if (frequency === "Weekly" && day !== null && day >= 0 && day <= 6) {
    parts.push(`**Day:** ${DAY_OF_WEEK_NAMES[day]}`);
  } else if (frequency === "Monthly" && day !== null) {
    parts.push(`**Day of Month:** ${day}`);
  }

  return parts.join("\n");
}

export default async function schedule(_client: Client, interaction: ChatInputCommandInteraction) {
  try {
    logger.commands.executing("setup schedule", interaction.user.username, interaction.user.id);

    if (!interaction.guildId) {
      return;
    }

    // Premium gate
    if (isPremiumEnabled() && !hasEntitlement(interaction)) {
      const skuId = getPremiumSkuId();
      const embed = new EmbedBuilder()
        .setColor(0xfadb7f)
        .setTitle("Premium Feature")
        .setDescription(
          "Custom quote scheduling is a premium feature! " +
            "Subscribe to FluffBoost Premium to customize when your server receives motivational quotes."
        )
        .addFields(
          { name: "Default Schedule", value: "Daily at 8:00 AM (America/Chicago)", inline: false },
          {
            name: "Premium Unlocks",
            value: "- Custom delivery time\n- Custom timezone\n- Weekly or monthly frequency",
            inline: false,
          }
        );

      await interaction.reply({
        embeds: [embed],
        components: skuId
          ? [
              {
                type: 1,
                components: [{ type: 2, style: 6, sku_id: skuId }],
              },
            ]
          : [],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const options = interaction.options;
    const frequency = (options.getString("frequency") ?? "Daily") as MotivationFrequency;
    const time = options.getString("time") ?? "08:00";
    const timezone = options.getString("timezone") ?? "America/Chicago";
    const day = options.getInteger("day");

    // Validate time format (HH:mm)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(time)) {
      await interaction.reply({
        content: "Invalid time format. Please use HH:mm format (e.g., `09:00`, `14:30`).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Validate timezone
    if (!isValidTimezone(timezone)) {
      await interaction.reply({
        content: "Invalid timezone. Please use a valid IANA timezone (e.g., `America/New_York`, `Europe/London`).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Validate day based on frequency
    if (frequency === "Weekly") {
      if (day === null || day < 0 || day > 6) {
        await interaction.reply({
          content: "Weekly frequency requires a `day` between 0 (Sunday) and 6 (Saturday).",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    } else if (frequency === "Monthly") {
      if (day === null || day < 1 || day > 28) {
        await interaction.reply({
          content: "Monthly frequency requires a `day` between 1 and 28.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
    }

    await guildExists(interaction.guildId);

    await prisma.guild.update({
      where: { guildId: interaction.guildId },
      data: {
        motivationFrequency: frequency,
        motivationTime: time,
        timezone,
        motivationDay: frequency === "Daily" ? null : day,
      },
    });

    const embed = new EmbedBuilder()
      .setColor(0xfadb7f)
      .setTitle("Schedule Updated")
      .setDescription(formatScheduleDescription(frequency, time, timezone, frequency === "Daily" ? null : day));

    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });

    logger.commands.success("setup schedule", interaction.user.username, interaction.user.id);
  } catch (err) {
    logger.commands.error("setup schedule", interaction.user.username, interaction.user.id, err);
    logger.error("Discord - Command", "Error executing setup schedule command", err, {
      user: { username: interaction.user.username, id: interaction.user.id },
      command: "setup schedule",
    });
  }
}

export async function autocomplete(interaction: AutocompleteInteraction) {
  const focused = interaction.options.getFocused(true);

  if (focused.name === "timezone") {
    const query = focused.value;
    const matches = filterTimezones(query);
    await interaction.respond(matches.map((tz) => ({ name: tz, value: tz })));
  }
}
