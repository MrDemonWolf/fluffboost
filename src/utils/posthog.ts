import { PostHog } from "posthog-node";

import env from "./env";

export default module.exports = new PostHog(env.POSTHOG_API_KEY, {
  host: env.POSTHOG_HOST,
});
