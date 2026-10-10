# Premium Go-Live Guide

Work through these sections top-to-bottom. Each section builds on the previous.

---

## Section 1 — Discord Developer Portal (one-time setup)

- [x] Go to [Discord Developer Portal](https://discord.com/developers/applications) → your app → **Monetization**
- [x] Enable monetization if not already enabled
- [x] Go to **SKUs** → Create a new subscription (name it, set price)
- [x] Copy the **SKU ID** — you'll need it in the next section

---

## Section 2 — Production Environment Variables (Dokploy)

- [ ] Set `PREMIUM_ENABLED=true` in production env (while it is `false`, every server can use custom schedules for free)
- [ ] Set `DISCORD_PREMIUM_SKU_ID=<paste-sku-id-from-above>` in production env
- [ ] Confirm all other required vars are present: `DATABASE_URL`, `REDIS_URL`, `DISCORD_APPLICATION_BOT_TOKEN`, `OWNER_ID`, `MAIN_CHANNEL_ID` (`DISCORD_APPLICATION_ID`, `DISCORD_APPLICATION_PUBLIC_KEY` and `MAIN_GUILD_ID` are no longer read)

---

## Section 3 — Deploy

- [ ] In Dokploy, set the health check path to `/api/health/live`, the Swarm Stop Grace Period to 35 s (`35000000000` ns), and Update/Rollback Config to `{"Parallelism":1,"Order":"stop-first","FailureAction":"rollback"}` (see the [deployment guide](https://mrdemonwolf.github.io/fluffboost/developers/deployment/))
- [ ] Before the first deploy that runs migrations, check whether the production database needs a migration baseline (`SELECT to_regclass('drizzle.__drizzle_migrations'), to_regclass('public."Guild"');`). If `Guild` exists without history, follow [Baseline an existing database](https://mrdemonwolf.github.io/fluffboost/developers/deployment/#baseline-an-existing-database) or set `SKIP_MIGRATIONS=true` until it is done
- [ ] Merge PR to `main` on GitHub
- [ ] Trigger deploy in Dokploy (or let the Dokploy webhook auto-deploy on push to `main`)
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

- [ ] Start bot with `bun run dev:discord`, `.env` has `PREMIUM_ENABLED=true` and `DISCORD_PREMIUM_SKU_ID=<sku>`
- [ ] Use `/owner premium test-list` to find existing test entitlements
- [ ] Use `/owner premium test-create` / `test-delete` to toggle premium on/off
