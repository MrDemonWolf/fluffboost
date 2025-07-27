import consola from "consola";
import cron from "node-cron";

import client from "../bot";
import env from "../utils/env";

/**
 * Worker Jobs
 */
import sendMotivation from "./jobs/sendMotivation";
import setActivity from "./jobs/setActivity";

export default function worker() {
  if (env.NODE_ENV === "development") {
    // run it every 5 mins for development purposes.
    cron.schedule(
      "*/5 * * * *",
      () => {
        sendMotivation();
      },
      {
        timezone: "America/Chicago",
      }
    );

    cron.schedule(
      env.DISCORD_ACTIVITY_CRON || "*/5 * * * *",
      () => {
        setActivity(client);
      },
      {
        timezone: "America/Chicago",
      }
    );
    return consola.info({
      message: `[Worker] Running in Development Mode`,
      badge: true,
      timestamp: new Date(),
    });
  }

  // Production cron jobs
  cron.schedule(
    "0 8 * * *",
    () => {
      sendMotivation();
    },
    {
      timezone: "America/Chicago",
    }
  );

  cron.schedule(
    env.DISCORD_ACTIVITY_CRON || "*/30 * * * *",
    () => {
      setActivity(client);
    },
    {
      timezone: "America/Chicago",
    }
  );
  consola.success({
    message: "[Worker] Running in Production Mode",
    badge: true,
    timestamp: new Date(),
  });
}
