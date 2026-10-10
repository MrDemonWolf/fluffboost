import type { Client } from "discord.js";

import { db } from "../../database/index.js";
import logger from "../../utils/logger.js";
import { createDueOccurrenceResolver } from "../../utils/scheduleEvaluator.js";
import { isPremiumEnabled } from "../../utils/premium.js";
import { buildMotivationEmbed, getRandomMotivationQuote, resolveQuoteAuthor } from "../../utils/quoteHelpers.js";
import { sendMotivationCore } from "./sendMotivationCore.js";

/**
 * One send-motivation tick. Once `signal` (the BullMQ processor signal) is
 * aborted, delivery stops claiming new guilds; unclaimed guilds roll over to
 * the next tick.
 */
export default async function sendMotivation(client: Client, signal?: AbortSignal): Promise<void> {
  await sendMotivationCore(
    client,
    {
      db,
      logger,
      // Fresh per tick: caches each distinct schedule's occurrence for this run only.
      dueOccurrence: createDueOccurrenceResolver(isPremiumEnabled()),
      getRandomMotivationQuote,
      resolveQuoteAuthor,
      buildMotivationEmbed,
    },
    signal
  );
}
