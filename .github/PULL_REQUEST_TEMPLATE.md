## Summary

<!-- One sentence: what does this PR do and why? -->

## Type of change

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `refactor` — no behavior change
- [ ] `perf` — performance improvement
- [ ] `docs` — documentation only
- [ ] `chore` — build, deps, config
- [ ] `breaking` — breaking change (requires major version bump)

## Related issues

Closes #

## Implementation notes

<!-- Anything non-obvious: design decisions, edge cases, trade-offs -->

## Database migrations

> Skip if `apps/discord/src/database/schema.ts` was not modified.

- [ ] Schema changed in `apps/discord/src/database/schema.ts`
- [ ] Migration generated via `bun run db:generate` (SQL and `drizzle/meta` committed)
- [ ] Migration tested locally via `bun run db:migrate`
- [ ] Migration is backwards-compatible (expand/contract), so a rollback to the previous image still works (or breaking change noted above)

## Discord-specific checklist

> Skip items that don't apply.

- [ ] New/renamed slash commands added to both `commandRegistry` and `slashCommands` in `apps/discord/src/events/commandRegistry.ts` (subcommands: the group router's route Map), and to `/help` and the command docs
- [ ] Channel fetches use `client.channels.fetch(id)` not `client.channels.cache.get(id)`
- [ ] Batch guild operations use `Promise.allSettled()`
- [ ] Premium gate applied where required (`isPremiumEnabled() && !hasEntitlement(interaction)`)
- [ ] Shard-safe — no assumptions about shared in-memory state across shards

## CI checklist

- [ ] `bun run test` passes (not a bare `bun test`, which also picks up the E2E suites)
- [ ] `bun run lint:check` passes
- [ ] `bun run typecheck` passes
- [ ] `bun run test:e2e` passes, if the change touches SQL, delivery, or the docs site
- [ ] `bun run brand:verify` passes, if `apps/motion` or `assets/brand` changed
- [ ] Docker build passes (validated by CI or `docker build -f apps/discord/Dockerfile .` locally)

## Breaking changes

<!-- List any breaking changes: new required env vars, renamed/removed commands, schema changes requiring data migration, changed API contracts -->

None.

## Screenshots / logs

<!-- Optional: attach relevant output, embed screenshots, or paste log snippets as evidence -->
