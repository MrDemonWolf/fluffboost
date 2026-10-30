/** Production wiring for the set-activity job: injects real deps into setActivityCore. */
import type { Client } from "discord.js";

import { db } from "../../database/index.js";
import env from "../../utils/env.js";
import logger from "../../utils/logger.js";
import { setActivityCore } from "./setActivityCore.js";
import type { SetActivityOptions } from "./setActivityCore.js";

/** Rotates the bot presence; also called from ready.ts with `{ scope: "local" }`. */
export default async (client: Client, options?: SetActivityOptions): Promise<void> => {
  await setActivityCore(client, { db, env, logger }, options);
};
