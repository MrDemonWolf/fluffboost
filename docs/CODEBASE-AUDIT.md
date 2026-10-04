# FluffBoost codebase audit

Reviewed October 3, 2026 across the Discord bot, worker, database, CI, marketing
site, and documentation. This report describes the integrated `dev` changes.
Production deployment and actual subscription checkout remain separate checks.

## Changes and evidence

| Priority | Finding | Result |
| --- | --- | --- |
| P1 | A shared worker could claim a quote for a guild on another shard and fail to resolve its channel. | Discord.js channel lookup now allows an uncached guild. A real Client test exercises the REST boundary and delivery. |
| P1 | Premium copy promised priority delivery, exclusive quotes, and early access without implementation. | Bot, website, guides, and marketing copy describe custom scheduling and project support. |
| P2 | Expired subscriptions retained customized delivery because the worker ignored the stored Premium flag. | Expired servers use the free schedule while retaining their saved customization. Startup reconciles purchases made while offline before starting the worker. |
| P2 | Autumn daylight-saving time could deliver twice during the repeated hour. | Dedupe compares the complete local date and time. Daily, weekly, monthly, and late-midnight catch-up regressions are covered. |
| P2 | Date arithmetic reused the current UTC offset for an occurrence across a daylight-saving transition. | Calendar selection and timezone resolution are separate. Spring gaps and catch-up windows now use the occurrence's own offset; eight additional regressions pass. |
| P2 | Quote text and rejection reasons could exceed Discord embed limits. | Slash options and runtime validation constrain new input; legacy content is bounded during rendering. |
| P2 | Channel setup could report success for an inaccessible delivery channel. | Setup checks guild, channel type, and View Channel, Send Messages, and Embed Links before writing. |
| P2 | `/quote` and `/about` performed slow work before acknowledging the interaction. | Both defer first and finish the response; errors complete the deferred reply. |
| P2 | Parent shutdown treated a signal as completed child shutdown. | Parent waits for actual child exit, with a bounded termination watchdog. A real child-process test verifies cleanup time. |
| P2 | Startup swallowed registration failures and could start the worker with incomplete initialization. | Initialization failures propagate; worker startup waits for guild initialization, subscription reconciliation, and command registration. |
| P2 | Production exposed Premium test commands and accepted test entitlement events. | Production excludes owner test commands from registration/help, rejects direct test calls, and ignores test grants and events. Revoking one paid grant reconciles other active grants. |

Subscription reconciliation fetches the complete paginated snapshot before any
database update. A failed page cannot clear paid status using partial results.
Only the configured SKU and matching server authorize Premium; deleted, expired,
future, user-scoped, and unrelated grants cannot authorize production access.

The database uses parameterized Drizzle queries. Runtime setup permissions,
the administrator allowlist, and owner guards were inspected. No confirmed SQL
injection or authorization bypass was found in this review.

## Duplicate audit

The source scan examined 91 production files. It identified **1 HIGH, 2 MEDIUM,
0 LOW** consolidations worth making. All three are implemented.

### [HIGH] Free schedule defaults

**Duplicated in:**
- `apps/discord/src/database/schema.ts` (previous lines 14-17)
- `apps/discord/src/commands/setup/schedule.ts` (previous lines 55-57)
- `apps/discord/src/utils/scheduleEvaluator.ts` (previous lines 25-30)

**What it does:** Defines Daily, 08:00, America/Chicago and no selected day.

**Why extract:** Divergence would make initial setup and expired-subscription
delivery disagree. Persisted database defaults are unchanged.

**Suggested helper, implemented:** `DEFAULT_GUILD_SCHEDULE` in
`apps/discord/src/utils/scheduleConfig.ts`.

### [MEDIUM] Command router logging

**Duplicated in:**
- `apps/discord/src/commands/admin/index.ts` (previous lines 188-192, 293-300)
- `apps/discord/src/commands/setup/index.ts` (previous lines 87-91, 112-119)
- `apps/discord/src/commands/owner/index.ts` (previous lines 60-64, 112-119)

**What it does:** Logs execution and errors, then safely replies on failure.

**Why extract:** The copies omitted guild context and could diverge from shared
deferred-response handling.

**Suggested helper, reused:**
`withCommandLogging(commandName, interaction, handler)` in
`apps/discord/src/utils/commandErrors.ts`.

### [MEDIUM] Documentation page rendering

**Duplicated in:**
- `apps/docs/app/docs/[[...slug]]/page.tsx` (previous lines 13-48)
- `apps/docs/app/developers/[[...slug]]/page.tsx` (previous lines 13-48)

**What it does:** Resolves MDX content, renders a Fumadocs page, and builds metadata.

**Why extract:** Layout and metadata fixes should apply to both documentation
sections together.

**Suggested helper, implemented:**
`DocumentationPage({ source, slug })` and
`getDocumentationMetadata(source, slug)` in
`apps/docs/components/documentation-page.tsx`.

Repeated subcommand authorization guards remain intentional protection for
direct calls. Thin dependency shims and common imports do not justify abstraction.

## Validation

- Bun 1.3.14: 291 unit tests passed, zero failures.
- Seven bot E2E tests passed against isolated real PostgreSQL. Discord transport
  is stubbed; no live server messages or purchases are made by this suite.
- Seven browser E2E tests passed against the static export with `/fluffboost`.
  One duplicated mobile viewport sweep is intentionally skipped.
- Browser checks cover desktop and mobile navigation, keyboard activation,
  legal pages, internal links, route reloads, assets, and horizontal overflow.
- Independent final regression review: 76 focused tests passed; no remaining
  actionable regression findings.
- Typecheck, ESLint, actionlint, and `git diff --check` passed.
- Static production build and frozen lockfile installation passed.
- Dependency audit: 35 advisories reduced to zero with compatible patched
  releases. The unpatched `braces` dependency chain was removed by replacing
  the old formatter with Prettier followed by the existing ESLint.
- Node type definitions are pinned to 22.20.1 to avoid the Node 25/Bun 1.3.14
  EventEmitter declaration conflict.

See `apps/docs/UIUX-REVIEW.md` for UI findings, contrast measurements, and browser
evidence, and `apps/docs/content/developer/testing.mdx` for reproducible commands.

## Live follow-up boundaries

- The local token identifies the development application. Production fixture
  deletion and server state are not verified using those credentials.
- Removing registered production test commands requires deploying this bot
  version and letting startup register the production command list.
- No production test entitlement has been deleted by this audit. Identify the
  exact test grant before cleanup; production now ignores such grants.
- Actual checkout, gateway reconnect, and delivery in a real multi-shard
  deployment remain live checks.
- The website's existing GitHub Pages environment permits only `main`.
  Publishing the updated `dev` website requires a docs-only promotion or an
  explicitly selected deployment policy change.

## Primary platform references

- [Discord entitlement resource](https://github.com/discord/discord-api-docs/blob/main/developers/resources/entitlement.mdx)
- [Discord gateway events](https://github.com/discord/discord-api-docs/blob/main/developers/events/gateway-events.mdx)
- [Discord interaction responses](https://github.com/discord/discord-api-docs/blob/main/developers/interactions/receiving-and-responding.mdx)
- [Discord Premium App FAQ](https://support-apps.discord.com/hc/en-us/articles/26501767768471-Premium-App-FAQ)
