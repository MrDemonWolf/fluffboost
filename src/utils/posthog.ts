import { PostHog } from "posthog-node";

import env from "./env.js";

const posthog = new PostHog(env.POSTHOG_API_KEY, {
  host: env.POSTHOG_HOST,
});

export default posthog;
