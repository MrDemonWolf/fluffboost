import { env } from "./env";
import { PostHog } from "posthog-node";

module.exports = new PostHog(env.POSTHOG_API_KEY, {
  host: env.POSTHOG_HOST,
});
