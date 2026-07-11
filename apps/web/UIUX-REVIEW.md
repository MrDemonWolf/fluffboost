# UI/UX Review: FluffBoost site (apps/web)

**Reviewed:** 2026-07-10 · **Input:** live local build (`/`, `/docs`, `/docs/commands`, `/developers`, `/developers/deployment`) + source in `apps/web` · **Method:** NN/g heuristic evaluation + WCAG 2.1 checks, measured from rendered HTML/CSS.

## Executive summary

- Strong overall. The design is warm, distinctive, and reads as hand-made rather than templated — it meets the "don't feel AI-generated" brief.
- **No catastrophic (Sev 4) findings.** The two Sev-3/2 issues found were fixed during the review (see below).
- Accessibility is a genuine strength: every text/background pair meets WCAG AA and most body text clears AAA (measured — see `scripts/contrast-check.mjs`), with a visible focus ring and full `prefers-reduced-motion` support.
- Heading structure is correct (one `<h1>`, descending `<h2>`→`<h3>`), and the mobile layout (375px) reflows cleanly with no horizontal scroll.

**Findings:** 🟥 0 catastrophic · 🟧 1 major (fixed) · 🟨 1 minor (fixed) · ⬜ 1 cosmetic (open)

## Findings

### 🟧 Severity 3 — Major

#### 1. Duplicate `<main>` landmark on the landing page — FIXED
- **What:** The page exposed two `<main>` landmarks — Fumadocs' `HomeLayout` renders `<main id="nd-home-layout">` and the page component nested a second `<main>`. Screen-reader users get an ambiguous "main" navigation target.
- **Where:** `apps/web/app/(home)/page.tsx` (`HomePage`).
- **Guideline:** WCAG 2.1 SC 1.3.1 Info & Relationships / ARIA landmark practice — a page should expose exactly one `main` landmark.
- **Evidence:** [W3C ARIA Authoring Practices — Landmark Regions](https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/) — there should be one and only one `main` landmark per page.
- **Fix:**
  - [x] Demote the page-level `<main>` to a `<div>`; let `HomeLayout` own the landmark. Verified: landing now emits a single `<main>`.

### 🟨 Severity 2 — Minor

#### 2. Hero `<h1>` wrapped with an orphaned word — FIXED
- **What:** At desktop widths the hero wrapped as "Your daily dose" / "of" / "furry motivation.", leaving "of" orphaned on its own line — a ragged, slightly awkward hero.
- **Where:** `apps/web/app/(home)/page.tsx` hero `<h1>` and section `<h2>`.
- **Guideline:** NN/g Typography & Visual Hierarchy — the primary headline is the strongest hierarchy signal and should read cleanly.
- **Evidence:** [Typography Terms Cheat Sheet (nngroup.com)](https://www.nngroup.com/articles/typography-terms-ux/) — orphans/rivers hurt legibility of display text.
- **Fix:**
  - [x] Add `text-wrap: balance` to hero/section headings and `text-wrap: pretty` to ledes.

### ⬜ Severity 1 — Cosmetic (open)

#### 3. Footer links are color-only at rest (underline on hover)
- **What:** Footer links use the muted ink color and only underline on hover/focus. They still pass contrast and are grouped under labeled `<nav>` headings, but aren't underlined at rest.
- **Where:** `apps/web/components/site-footer.tsx`.
- **Guideline:** NN/g — links should be visually distinguishable; underlining is the most unambiguous signal.
- **Evidence:** [Guidelines for Visualizing Links (nngroup.com)](https://www.nngroup.com/articles/guidelines-for-visualizing-links/) — in dense body text underline links; in clearly-navigational regions (nav, footer) color grouping is acceptable.
- **Fix (optional):** Leave as-is — footers are a recognized navigational region — or add a persistent underline if you want maximum affordance.

## What's working well

- **Measured contrast, not eyeballed.** `scripts/contrast-check.mjs` proves body text is AAA and every brand/button pair is AA in both light and dark themes.
- **Accessible motion.** All decorative animation (marquee, float, staggered reveals) is disabled under `prefers-reduced-motion`, and the marquee is `aria-hidden`.
- **Real semantic structure.** One `<h1>`, descending headings, `<nav>`/`<footer>` landmarks, decorative SVGs marked `aria-hidden`, and a keyboard-visible `:focus-visible` ring.
- **Mobile-first.** At 375px the nav collapses to a hamburger, the hero stacks, CTAs go full-width, and nothing overflows horizontally.
- **On-brand, not templated.** Fraunces + Nunito, a warm honey/berry/pine palette on paper, grain + sunrise atmosphere, and a Discord-embed quote card that mirrors the real product.

## Quick wins

- [x] Remove the duplicate `<main>` landmark (finding #1).
- [x] Balance hero/section headings, pretty-wrap ledes (finding #2).
- [ ] (Optional) Persistent underline on footer links (finding #3).
