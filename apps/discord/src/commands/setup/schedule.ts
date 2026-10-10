import { MessageFlags } from "discord.js";
import type { Client, ChatInputCommandInteraction, AutocompleteInteraction } from "discord.js";

import { eq } from "drizzle-orm";

import logger from "../../utils/logger.js";
import { withCommandLogging } from "../../utils/commandErrors.js";
import { db } from "../../database/index.js";
import { guilds } from "../../database/schema.js";
import type { MotivationFrequency } from "../../database/schema.js";
import { guildExists } from "../../utils/guildDatabase.js";
import { buildPremiumUpsell, hasEntitlement, isPremiumEnabled } from "../../utils/premium.js";
import { parseHourMinute } from "../../utils/scheduleEvaluator.js";
import { isValidTimezone, filterTimezones } from "../../utils/timezones.js";
import { buildBrandedEmbed } from "../../utils/embedHelpers.js";
import { DEFAULT_GUILD_SCHEDULE, describeDefaultSchedule } from "../../utils/scheduleConfig.js";
import { requireGuildAdministrator, requireGuildId } from "../../utils/permissions.js";

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

export default async function schedule(_client: Client, interaction: ChatInputCommandInteraction): Promise<void> {
  await withCommandLogging("setup schedule", interaction, async () => {
    const guildId = await requireGuildId(interaction);
    if (!guildId) {return;}
    if (!(await requireGuildAdministrator(interaction))) {return;}

    const premiumEnabled = isPremiumEnabled();
    if (premiumEnabled && !hasEntitlement(interaction)) {
      const defaultSchedule = describeDefaultSchedule();
      const upsell = buildPremiumUpsell({
        title: "Premium Feature",
        description:
          "Custom quote scheduling is a premium feature! " +
          "Subscribe to FluffBoost Premium to customize when your server receives motivational quotes.",
        fields: [
          { name: "Default Schedule", value: defaultSchedule.charAt(0).toUpperCase() + defaultSchedule.slice(1) },
          {
            name: "Premium Unlocks",
            value: "- Custom delivery time\n- Custom timezone\n- Weekly or monthly frequency",
          },
        ],
      });

      await interaction.reply({ ...upsell, flags: MessageFlags.Ephemeral });
      return;
    }

    // Omitted options keep the saved schedule rather than resetting to the
    // free defaults, so `/setup schedule time:10:00` changes only the time.
    const [current] = await db
      .select()
      .from(guilds)
      .where(eq(guilds.guildId, guildId))
      .limit(1);
    const base = current ?? DEFAULT_GUILD_SCHEDULE;

    const options = interaction.options;
    // Discord restricts `frequency` to the registered choices.
    const frequency = (options.getString("frequency") ?? base.motivationFrequency) as MotivationFrequency;
    const time = options.getString("time") ?? base.motivationTime;
    const timezone = options.getString("timezone") ?? base.timezone;
    // A saved weekday is not a valid day of month (and vice versa), so reuse the
    // saved day only when the frequency is unchanged.
    const day = options.getInteger("day") ??
      (frequency === base.motivationFrequency ? base.motivationDay : null);

    if (parseHourMinute(time) === null) {
      await interaction.reply({
        content: "Invalid time format. Please use HH:mm format (e.g., `09:00`, `14:30`).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!isValidTimezone(timezone)) {
      await interaction.reply({
        content: "Invalid timezone. Please use a valid IANA timezone (e.g., `America/New_York`, `Europe/London`).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

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

    await guildExists(guildId);

    const changes: Partial<typeof guilds.$inferInsert> = {
      motivationFrequency: frequency,
      motivationTime: time,
      timezone,
      motivationDay: frequency === "Daily" ? null : day,
    };
    if (premiumEnabled) {
      // The gate above just proved an active entitlement; self-heal a stale
      // flag (e.g. a missed ENTITLEMENT_CREATE) so delivery honors it.
      changes.isPremium = true;
    }
    await db.update(guilds).set(changes).where(eq(guilds.guildId, guildId));

    const embed = buildBrandedEmbed({
      title: "Schedule Updated",
      description: formatScheduleDescription(frequency, time, timezone, frequency === "Daily" ? null : day),
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  });
}

export async function autocomplete(interaction: AutocompleteInteraction): Promise<void> {
  try {
    const focused = interaction.options.getFocused(true);

    if (focused.name === "timezone") {
      const query = focused.value;
      const matches = filterTimezones(query);
      await interaction.respond(matches.map((tz) => ({ name: tz, value: tz })));
    }
  } catch (err) {
    logger.error("Discord - Command", "Error handling setup schedule autocomplete", err);
    await interaction.respond([]).catch(() => {});
  }
}
