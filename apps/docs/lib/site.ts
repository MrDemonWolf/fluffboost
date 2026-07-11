// Single source of truth for outbound links + copy used across the site.
export const site = {
  name: "FluffBoost",
  tagline: "Your daily dose of furry motivation",
  description:
    "FluffBoost is a warm, furry-friendly Discord bot that delivers scheduled motivational quotes to your server — with per-guild timing, community suggestions, and an optional premium tier.",
  clientId: "1152416549261561856",
  inviteUrl:
    "https://discord.com/api/oauth2/authorize?client_id=1152416549261561856&permissions=2147551232&scope=bot",
  discordUrl: "https://mrdwolf.net/discord",
  githubUrl: "https://github.com/MrDemonWolf/fluffboost",
  companyUrl: "https://www.mrdemonwolf.com",
  // Change to your production origin (or a CNAME) for correct OG/canonical URLs.
  origin: "https://mrdemonwolf.github.io/fluffboost",
} as const;
