# UI/UX Review: FluffBoost site and subscription guidance

**Reviewed:** October 3, 2026 · **Input:** source in `apps/docs` and
`apps/discord`, local static export under `/fluffboost`, current `banner.jpg`,
and four supplied Discord portal screenshots · **Method:** NN/g heuristic
evaluation and WCAG 2.2 guideline review, with Chromium browser checks.

## Executive summary

- The existing Next.js/Fumadocs site already provides a warm, distinctive base.
  The review preserved its typography and woodland palette and reused the real
  FluffBoost wolf artwork.
- The largest problem was inaccurate product guidance: local server libraries,
  local-admin review, and no-DM claims contradicted the bot's implementation.
  Those statements are corrected throughout the landing page, guides, and README.
- Five source-backed issues are fixed: three major and two minor. No catastrophic
  or unresolved major defect is established by this source review.
- The palette script verifies 17 solid foreground/background pairs in both
  themes. This does not establish full WCAG conformance or cover every blended
  badge, hover state, generated Fumadocs control, or browser rendering.
- Supplied screenshots establish the visible portal fields and historical copy,
  not the current production bot, checkout, or published site.

**Findings:** 🟥 0 catastrophic · 🟧 3 major (fixed) · 🟨 2 minor (fixed) · ⬜ 0 cosmetic.

Severity uses [NN/g's 0–4 scale](https://www.nngroup.com/articles/how-to-rate-the-severity-of-usability-problems/),
based on impact, frequency, and persistence. This is an engineering heuristic
review, not a moderated user study.

## Findings

### 🟧 Severity 3 — Major

#### 1. Product copy described private server behavior that does not exist — FIXED

- **What:** The landing page and suggestions guide said each server builds its
  own library and its admins review it. The schema has no server ID on quotes or
  suggestions; approval writes to a shared library and is restricted by
  `ALLOWED_USERS`. The FAQ also claimed the bot never DMs members, although review
  notifications call `submitter.send()`. Users could submit private material or
  expect controls they cannot access; this materially affects informed use.
- **Where:** `app/(home)/page.tsx`, `content/user/suggestions.mdx`,
  `content/user/commands.mdx`, `content/user/faq.mdx`, and the root README.
- **Guideline:** Match between the system and the real world; error prevention.
- **Evidence:** [10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
  — descriptions should match the system users actually encounter, with useful
  information before they make an error. Source evidence:
  `apps/discord/src/database/schema.ts`, `src/commands/suggestion.ts`, and
  `src/utils/suggestionHelpers.ts`.
- **Fix:**
  - [x] Explain shared-library publication and bot-team review.
  - [x] Describe possible review-result DMs and profile attribution.
  - [x] Correct setup permissions to Administrator and identify operator-only
    content controls.
  - [x] Remove unsupported claims about free availability forever, timed setup,
    and server-controlled bot status.

#### 2. Privacy and terms had no published-site routes — FIXED IN SOURCE

- **What:** The existing export had no privacy or terms pages or footer links.
  A prospective subscriber could not find the service's data handling,
  cancellation, content-sharing, or deletion information on the product site.
- **Where:** `app/(home)/privacy/page.tsx`, `app/(home)/terms/page.tsx`, and
  `components/site-footer.tsx`.
- **Guideline:** Help and documentation; recognition rather than recall.
- **Evidence:** [Help and Documentation](https://www.nngroup.com/articles/help-and-documentation/)
  — task-focused information should be findable when users need it. The
  [Discord Developer Policy](https://support-dev.discord.com/hc/en-us/articles/8563934450327-Discord-Developer-Policy)
  also requires developers to handle API data responsibly.
- **Fix:**
  - [x] Add `/privacy` and `/terms` with operator contact and source-backed data
    practices; avoid invented retention periods or legal compliance guarantees.
  - [x] Link both pages from the landing/legal footer and Premium guide.
  - [ ] Verify the deployed public URLs after the GitHub Pages release.
  - [ ] Set the verified public URLs in the Discord Developer Portal.

#### 3. Channel setup could report success without delivery permissions — FIXED

- **What:** The previous setup command saved the selected channel without
  checking whether FluffBoost could post an embed there. A server administrator
  could see a successful setup response and wait for a quote that never arrived.
- **Where:** `apps/discord/src/commands/setup/channel.ts`.
- **Guideline:** Error prevention; help users recognize and recover from errors.
- **Evidence:** [10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
  — prevent avoidable errors and explain recovery rather than implying success.
- **Fix:**
  - [x] Fetch the channel and validate server, text-channel eligibility, and View
    Channel, Send Messages, and Embed Links permissions before saving.
  - [x] Return a concrete permission-recovery message when validation fails.
  - [x] Verify the setup regression suite: four tests passed with synthetic test
    environment values and mocked Discord/database dependencies.

### 🟨 Severity 2 — Minor

#### 4. Endless decoration lacked a general pause mechanism — FIXED

- **What:** The marquee ran for 40 seconds with infinite repeats and paused
  only on pointer hover. A floating paw ran a six-second infinite loop without
  pause controls. Reduced-motion support did not give every user a way to stop
  this automatic movement.
- **Where:** `app/(home)/page.tsx` and `.fb-marquee` / `.fb-float` in
  `app/global.css` before the change.
- **Guideline:** WCAG 2.2 SC 2.2.2, Pause, Stop, Hide.
- **Evidence:** [W3C Understanding SC 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
  — automatic movement that runs beyond five seconds alongside other content
  needs a pause, stop, or hide mechanism when it is not essential.
- **Fix:**
  - [x] Make the ribbon and decorative paw static.
  - [x] Retain the brief 0.7-second page reveal and reduced-motion override.

#### 5. Premium instructions did not help users diagnose activation failures — FIXED

- **What:** The old guide described a purchase button and schedule command but
  omitted the desktop/browser restriction, correct-server selection, Administrator
  requirement, unavailable-Premium state, and practical recovery steps.
- **Where:** `content/user/premium.mdx`; operator setup is now documented in
  `content/developer/premium.mdx`.
- **Guideline:** Help users recognize and recover from errors; help and documentation.
- **Evidence:** [Help and Documentation](https://www.nngroup.com/articles/help-and-documentation/)
  — proactive and troubleshooting help should list concrete steps. The
  [Discord Premium App FAQ](https://support-apps.discord.com/hc/en-us/articles/26501767768471-Premium-App-FAQ)
  documents purchase surfaces and billing management.
- **Fix:**
  - [x] Provide purchase → Premium Active → Schedule Updated checkpoints.
  - [x] Add a symptom/action table, support details, and cancellation guidance.
  - [x] Explain operator SKU configuration and separation of test applications.
  - [ ] Verify the guide's full purchase flow against the live hosted application.

## Unverified (needs a different input to check)

- Live Discord purchase, renewal, expiry, and scheduled delivery — require the
  running application and the appropriate subscription/server access.
- Deployed Pages links and Developer Portal policy fields — local source changes
  do not establish published URLs or saved portal configuration.
- Full screen-reader, Safari, touch-device, and high-zoom behavior — source and
  headless tests alone cannot establish those outcomes.
- Every contrast pair and every component's focus/target behavior — the token
  script checks only its explicitly listed combinations.
- Operational backup/log retention and infrastructure details — source identifies
  stored records but cannot prove the operator's production retention settings.

## What's working well

- Fraunces display type and Nunito body type preserve the warm identity. Main
  marketing body copy now uses 16px or larger; it is not reduced at mobile widths.
- The real gray-and-cream wolf artwork appears in the quote preview and avatar.
  Example quotes and suggestions are labeled as examples.
- The landing page keeps one page-level h1, section h2s, and card h3s. Fumadocs
  owns the main landmark; the page does not add a nested main.
- The palette check passes all 17 listed pairs: light primary-button ink/honey
  is 5.44:1; light muted ink/paper is 8.15:1. These satisfy
  [SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  for those measured combinations.
- Footer links have persistent underlines and a minimum 24px height. Focus
  styling and reduced-motion handling remain defined in CSS.
- Measured page widths are 320px, 390px, and 1280px at those respective viewports;
  each has one main and one h1. The h1 measures 41.6px on mobile and 70.4px on
  desktop. At 320px, keyboard focus and Enter open the mobile navigation.

## Checklist coverage

| Check area | Current evidence and boundary |
| --- | --- |
| Status and feedback | Premium checkpoints and setup-error responses inspected in source; live Discord status remains unverified. |
| Real-world language | Shared library, operator review, subscription scope, and permission wording corrected against the implementation. |
| Control and navigation | Landing → guide → setup, legal-page navigation, and reloads pass in Chromium desktop/mobile emulation. |
| Consistency and standards | Internal links and assets use the custom-domain root; current tests report no client errors or local 404s. |
| Error prevention and recovery | Channel permission regression passes; paid-activation guide includes concrete symptom/action recovery. |
| Recognition and efficiency | Command reference and task links are visible; keyboard mobile menu tested. Static documentation search was not exercised in this pass. |
| Aesthetics and hierarchy | Existing artwork and type system preserved; one h1/main confirmed at three widths; real device and screen-reader experience unverified. |
| Help and documentation | Guide, Premium activation, operator setup, and policy pages built and linked; checkout itself was not automated. |
| Typography | Main body copy is at least 16px in source; h1 values measured above. Full component-by-component line-length measurements remain unverified. |
| Accessibility | 17 solid contrast pairs pass; motion is finite; minimum footer-link height defined. This is not a full accessibility conformance assessment. |
| Forms | This marketing site does not collect billing or account input. Discord owns checkout, which is outside the browser test scope. |
| Responsive layout | No horizontal overflow at 320, 390, 393, or 1280px in the tested browser flows. Physical-device testing remains unverified. |

## Quick wins

- [x] Correct shared-library, permissions, and DM statements (finding #1).
- [x] Add privacy and terms routes and link them (finding #2).
- [x] Validate channel delivery permissions before saving (finding #3).
- [x] Stop the endless decorative animations (finding #4).
- [x] Turn Premium guidance into concrete activation and recovery steps (finding #5).
- [ ] Verify public legal URLs and save them in the portal after deployment.
- [ ] Perform the live Premium activation walkthrough on the production bot.

## Evidence recorded for this revision

- `bun apps/docs/scripts/contrast-check.mjs`: all 17 listed pairs passed.
- `git diff --check`: passed when this report was prepared.
- Source was compared directly with the bot's schema, command permissions,
  suggestion review notifications, and Premium command behavior.
- Bun 1.3.14: scoped docs typecheck passed. GitHub Pages static export was built
  with `NEXT_PUBLIC_BASE_PATH=/fluffboost` for the repository-path deployment;
  the custom-domain deployment uses the root path.
- Final website E2E: eleven passed, zero failed, one intentional skip (the same
  three-width sweep runs once rather than twice under both device projects).
- Browser results above were rerun successfully after consolidating the Guide
  and Developers rendering in `components/documentation-page.tsx`; both route
  exports and static parameters remain explicit.
- Bot end-to-end integration: seven passed against an isolated real PostgreSQL
  database with simulated Discord interactions; no paid checkout or real
  message delivery was performed by those tests.
- Stable visual captures await completion of the finite page reveals. Viewport
  and full-page images are saved under the ignored
  `apps/docs/test-results/site-the-landing-page-fits-258be-upports-keyboard-activation-desktop/`
  directory as `landing-320`, `landing-390`, and `landing-1280` PNGs, with
  `-viewport` variants. These are local test artifacts, not published assets.
