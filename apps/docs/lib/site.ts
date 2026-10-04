// Single source of truth for outbound links + copy used across the site.
export const site = {
  name: "FluffBoost",
  tagline: "Your daily dose of furry motivation",
  description:
    "A little encouragement for your Discord community. Get daily quotes, suggest additions to a shared library, and unlock custom scheduling with FluffBoost Premium.",
  clientId: "1152416549261561856",
  inviteUrl:
    "https://discord.com/oauth2/authorize?client_id=1152416549261561856&permissions=19456&scope=bot%20applications.commands",
  discordUrl: "https://mrdwolf.net/discord",
  githubUrl: "https://github.com/MrDemonWolf/fluffboost",
  companyUrl: "https://www.mrdemonwolf.com",
  // Change to your production origin (or a CNAME) for correct OG/canonical URLs.
  origin: "https://mrdemonwolf.github.io/fluffboost",
} as const;
