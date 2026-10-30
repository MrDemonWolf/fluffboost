/** Single source of truth for outbound links, base-path handling and copy used across the site. */

const CLIENT_ID = "1152416549261561856";
// ViewChannel (1024) | SendMessages (2048) | EmbedLinks (16384). Keep in sync with
// the permissions apps/discord/src/commands/invite.ts passes to generateInvite.
const INVITE_PERMISSIONS = 19456;

// The site is served at the root of its custom domain (public/CNAME), so the
// deployed build has no base path. NEXT_PUBLIC_BASE_PATH stays supported for
// previewing the export under a subpath: next.config.mjs applies it to routes
// and imported assets; use withBasePath() for raw /public URLs. Changing the
// domain means updating `origin` below (app/sitemap.ts, app/robots.ts,
// canonical URLs and og:url all derive from it), public/CNAME, SITE_ORIGIN in
// e2e/site.spec.ts and the Guide link in apps/discord/src/commands/about.ts.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefixes a /public path with the base path, for URLs Next does not rewrite (e.g. <video src>, fetch). */
export function withBasePath(path: `/${string}`): string {
  return `${basePath}${path}`;
}

export const site = {
  name: "FluffBoost",
  tagline: "Your daily dose of furry motivation",
  description:
    "A little encouragement for your Discord community. Get daily quotes, suggest additions to a shared library, and unlock custom scheduling with FluffBoost Premium.",
  clientId: CLIENT_ID,
  inviteUrl:
    `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}` +
    `&permissions=${INVITE_PERMISSIONS}&scope=bot%20applications.commands`,
  discordUrl: "https://mrdwolf.net/discord",
  githubUrl: "https://github.com/MrDemonWolf/fluffboost",
  companyUrl: "https://www.mrdemonwolf.com",
  // Production origin (no trailing slash) for OG, canonical and sitemap URLs.
  origin: "https://fluffboost.mrdemonwolf.dev",
} as const;
