# FluffBoost marketing copy

Prepared October 3, 2026. These drafts describe the repository's implemented
features. Portal changes and publishing are tracked separately from these files.
Discord's checkout is authoritative for price and renewal terms.

## Discord Discovery summary

Paste this into the 200-character summary field:

```text
A little encouragement for your Discord community. Get daily motivational quotes, suggest your own, and choose a custom schedule with optional FluffBoost Premium.
```

## Discord expanded description

```markdown
# A little boost. A brighter community.

FluffBoost brings uplifting quotes to your Discord server, one thoughtful message at a time. Built with furry communities in mind and welcoming to anyone who could use a little encouragement.

## Start with the free daily boost

- Daily motivation delivered to a text channel you choose, at 8:00 AM America/Chicago.
- Instant encouragement with `/quote` whenever you need it.
- Quote suggestions with `/suggestion`, reviewed by the FluffBoost team for a shared library that can brighten other servers, too.
- A simple setup flow, with no separate account or dashboard.

## Make the timing yours with Premium

FluffBoost Premium adds custom scheduling for one server: daily, weekly, or monthly delivery at your chosen time and timezone. Purchase and manage your subscription through Discord.

Run `/premium` in the server you want to upgrade, complete Discord's checkout on desktop or in a browser, then run `/premium` again to confirm Premium Active. A server administrator can set the schedule with `/setup schedule`.

## Get started

1. Add FluffBoost to your server.
2. Ask a server administrator to run `/setup channel` and choose a text channel.
3. Try `/quote` now and enjoy the next daily boost.

Use `/help` for commands, `/about` for project information, or `/invite` to share FluffBoost.

Open source. Built by MrDemonWolf, Inc. Spread joy, one quote at a time.

Guide: https://mrdemonwolf.github.io/fluffboost/docs/
Premium activation: https://mrdemonwolf.github.io/fluffboost/docs/premium/
Support: https://mrdwolf.net/discord
```

## Recommended Discovery links

| Label | URL |
| --- | --- |
| Website & Guide | https://mrdemonwolf.github.io/fluffboost/ |
| Activate Premium | https://mrdemonwolf.github.io/fluffboost/docs/premium/ |
| Support | https://mrdwolf.net/discord |
| Source Code | https://github.com/MrDemonWolf/fluffboost |
| Creator | https://www.mrdemonwolf.com |

General Information privacy URL:
`https://mrdemonwolf.github.io/fluffboost/privacy/`.
General Information terms URL:
`https://mrdemonwolf.github.io/fluffboost/terms/`.
Publish the Pages build before entering these new legal URLs in Discord.

## Premium SKU

Recommended name: **FluffBoost Premium**.

Short description, below Discord's documented 160-character limit:

```text
Choose when your server gets its boost: daily, weekly, or monthly quotes at your preferred time and timezone. Includes all free features.
```

Expanded description for portal fields that support longer copy:

```text
Give your community a boost at the right moment. FluffBoost Premium unlocks custom quote scheduling for one Discord server.

Choose daily, weekly, or monthly delivery, set a time, and pick the timezone that fits your community. Use /premium to check your subscription and /setup schedule to configure it.

Daily quotes, instant /quote requests, and community suggestions are available without Premium. Your subscription also supports FluffBoost's continued development.

Billing and cancellation are managed through Discord. Review the price and renewal details in checkout before subscribing.
```

| Benefit | Description |
| --- | --- |
| Your time, your timezone | Choose the delivery time and timezone that suit your community. |
| A rhythm that fits | Schedule quotes daily, weekly, or monthly, including a chosen weekday or date. |
| Support FluffBoost | Help support ongoing development of an open-source bot built for encouragement. |

The supplied screenshots show $1.99/month. Do not hardcode that as a universal
price; confirm the current SKU and display checkout's price for each purchase.
Do not advertise exclusive quotes, priority delivery, or private server libraries.

## Social launch copy

```text
A little boost for your Discord community.

FluffBoost sends a daily motivational quote to the channel you choose. Try /quote whenever you need a lift, or suggest a quote for the shared community library.

Want your own rhythm? Premium adds daily, weekly, or monthly delivery at your chosen time and timezone.

Add FluffBoost and read the guide: https://mrdemonwolf.github.io/fluffboost/
```

## Source checks

- Commands: `apps/discord/src/events/commandRegistry.ts` and `src/commands/`.
- Shared quote library and stored data: `apps/discord/src/database/schema.ts`.
- Suggestions and review-result DMs: `src/commands/suggestion.ts` and
  `src/utils/suggestionHelpers.ts` in the bot package.
- Premium: `apps/discord/src/utils/premium.ts` and `src/commands/setup/schedule.ts`.
- [Discord Premium App FAQ](https://support-apps.discord.com/hc/en-us/articles/26501767768471-Premium-App-FAQ).
- [Discord SKU and Store Setup](https://support-dev.discord.com/hc/en-us/articles/17298449675927-Premium-Apps-SKU-and-Store-Setup).
