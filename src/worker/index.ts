import cron from "node-cron";

import client from "../bot";
import env from "../utils/env";
import logger from "../utils/logger";

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
    return logger.info("Worker", "Running in Development Mode", {
      activityCron: env.DISCORD_ACTIVITY_CRON || "*/5 * * * *",
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
  logger.success("Worker", "Running in Production Mode", {
    motivationCron: "0 8 * * *",
    activityCron: env.DISCORD_ACTIVITY_CRON || "*/30 * * * *",
  });
}
