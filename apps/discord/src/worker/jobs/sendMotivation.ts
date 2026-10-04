import type { Client } from "discord.js";

import { db } from "../../database/index.js";
import logger from "../../utils/logger.js";
import {
  effectiveGuildSchedule, isGuildDueForMotivation, mostRecentScheduledOccurrence,
} from "../../utils/scheduleEvaluator.js";
import { isPremiumEnabled } from "../../utils/premium.js";
import { buildMotivationEmbed, getRandomMotivationQuote, resolveQuoteAuthor } from "./sendMotivationDeps.js";
import { sendMotivationCore } from "./sendMotivationCore.js";

export default async function sendMotivation(client: Client): Promise<void> {
  await sendMotivationCore(client, {
    db,
    logger,
    isGuildDueForMotivation: (guild) => isGuildDueForMotivation(effectiveGuildSchedule(guild, isPremiumEnabled())),
    mostRecentScheduledOccurrence: (guild) => mostRecentScheduledOccurrence(
      effectiveGuildSchedule(guild, isPremiumEnabled())
    ),
    getRandomMotivationQuote,
    resolveQuoteAuthor,
    buildMotivationEmbed,
  });
}

export { sendMotivationCore };
