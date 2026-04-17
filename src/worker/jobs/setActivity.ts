import type { Client } from "discord.js";

import { db } from "../../database/index.js";
import env from "../../utils/env.js";
import logger from "../../utils/logger.js";
import { setActivityCore } from "./setActivityCore.js";

export default async (client: Client): Promise<void> => {
  await setActivityCore(client, { db, env, logger });
};

export { setActivityCore };
