# Premium Testing TODO

## Prerequisites
- [ ] Bot running (`bun dev`)
- [ ] `.env` has `PREMIUM_ENABLED=true`
- [ ] `.env` has `DISCORD_PREMIUM_SKU_ID=<your_sku_id>`

## Find & Clean Up Old Entitlement
- [ ] Run `/owner premium test-list` in Discord
- [ ] Copy the entitlement ID from the old test entitlement
- [ ] Run `/owner premium test-delete entitlement_id:<paste_id>`
- [ ] Run `/owner premium test-list` again to confirm it's gone

## Test the Upsell Flow (no entitlement)
- [ ] Run `/premium` → should show gold upsell embed with purchase button
- [ ] Run `/setup schedule` → should show premium upsell and block you

## Test the Subscribed Flow (with entitlement)
- [ ] Run `/owner premium test-create` → **save the entitlement ID!**
- [ ] Run `/premium` → should show green "Premium Active" embed
- [ ] Run `/setup schedule frequency:Weekly time:09:00 timezone:America/New_York day:1`
      → should succeed and save your schedule

## Clean Up When Done
- [ ] Run `/owner premium test-delete entitlement_id:<id>`
- [ ] Run `/premium` → should be back to upsell
