import { ActivityType } from "discord.js";
import type { Client } from "discord.js";

import consola from "consola";

export function setActivity(client: Client): void {
  try {
    client.user?.setActivity("Spreading Paw-sitivity 🐾", {
      type: ActivityType.Custom,
    });
    consola.success({
      message: "Discord has been activity set",
      badge: true,
    });
  } catch (err) {
    consola.error({
      message: `Error setting custom discord activity: ${err}`,
      badge: true,
    });
  }
}
