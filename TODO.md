# Premium Go-Live Guide

Work through these sections top-to-bottom. Each section builds on the previous.

---

## Section 1 — Discord Developer Portal (one-time setup)

- [x] Go to [Discord Developer Portal](https://discord.com/developers/applications) → your app → **Monetization**
- [x] Enable monetization if not already enabled
- [x] Go to **SKUs** → Create a new subscription (name it, set price)
- [x] Copy the **SKU ID** — you'll need it in the next section

---

## Section 2 — Production Environment Variables (Coolify)

- [ ] Set `PREMIUM_ENABLED=true` in production env
- [ ] Set `DISCORD_PREMIUM_SKU_ID=<paste-sku-id-from-above>` in production env
- [ ] Confirm all other required vars are present: `DATABASE_URL`, `REDIS_URL`, `DISCORD_APPLICATION_ID`, `DISCORD_APPLICATION_PUBLIC_KEY`, `DISCORD_APPLICATION_BOT_TOKEN`, `OWNER_ID`, `MAIN_GUILD_ID`, `MAIN_CHANNEL_ID`

---

## Section 3 — Deploy

- [ ] Merge PR to `main` on GitHub
- [ ] Trigger deploy in Coolify (or let auto-deploy fire on push to `main`)
- [ ] Watch logs — confirm bot starts with no `"DISCORD_PREMIUM_SKU_ID is not configured"` error

---

## Section 4 — Verify in Production

- [ ] Run `/premium` → should show gold upsell embed with purchase button
- [ ] Run `/setup schedule` → should show premium upsell and block you
- [ ] Verify an active Premium entitlement using the production purchase flow
- [ ] Run `/premium` → should show green "Premium Active" embed
- [ ] Run `/setup schedule frequency:Weekly time:09:00 timezone:America/New_York day:1` → should succeed and save schedule
- [ ] Confirm another server without Premium still sees the Premium gate

Test entitlements are disabled on the production bot. Use a separate dev or
staging application for `/owner premium test-create`, `test-list`, and
`test-delete`, as described in `apps/docs/content/developer/premium.mdx`.

---

## Section 5 — Dev/Local Testing (future reference)

- [ ] Start bot with `bun dev`, `.env` has `PREMIUM_ENABLED=true` and `DISCORD_PREMIUM_SKU_ID=<sku>`
- [ ] Use `/owner premium test-list` to find existing test entitlements
- [ ] Use `/owner premium test-create` / `test-delete` to toggle premium on/off
