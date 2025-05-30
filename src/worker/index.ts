import consola from "consola";
import cron from "node-cron";
import { env } from "../utils/env";

/**
 * Worker Jobs
 */
import sendMotivation from "./jobs/sendMotivation";

export default function worker() {
  if (env.NODE_ENV === "development") {
    return consola.info({
      message: `Worker: Running in Development Mode`,
      badge: true,
    });
  }
  cron.schedule(
    "0 8 * * *",
    () => {
      sendMotivation();
    },
    {
      scheduled: true,
      timezone: "America/Chicago",
    }
  );
  consola.success({
    message: `Worker: Launched`,
    badge: true,
  });
}
