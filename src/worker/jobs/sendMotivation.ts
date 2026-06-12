import type { Client } from "discord.js";

import { db } from "../../database/index.js";
import logger from "../../utils/logger.js";
import { isGuildDueForMotivation } from "../../utils/scheduleEvaluator.js";
import { buildMotivationEmbed, getRandomMotivationQuote, resolveQuoteAuthor } from "./sendMotivationDeps.js";
import { sendMotivationCore } from "./sendMotivationCore.js";

export default async function sendMotivation(client: Client): Promise<void> {
  await sendMotivationCore(client, {
    db,
    logger,
    isGuildDueForMotivation,
    getRandomMotivationQuote,
    resolveQuoteAuthor,
    buildMotivationEmbed,
  });
}

export { sendMotivationCore };
