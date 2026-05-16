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

> Skip if `src/database/schema.ts` was not modified.

- [ ] Schema changed in `src/database/schema.ts`
- [ ] Migration generated via `bun run db:generate`
- [ ] Migration tested locally via `bun run db:migrate`
- [ ] Migration is backwards-compatible (or breaking change noted above)

## Discord-specific checklist

> Skip items that don't apply.

- [ ] New/renamed slash commands registered in `src/events/ready.ts` and routed in `src/events/interactionCreate.ts`
- [ ] Channel fetches use `client.channels.fetch(id)` not `client.channels.cache.get(id)`
- [ ] Batch guild operations use `Promise.allSettled()`
- [ ] Premium gate applied where required (`isPremiumEnabled() && !hasEntitlement(interaction)`)
- [ ] Shard-safe — no assumptions about shared in-memory state across shards

## CI checklist

- [ ] `bun test` passes
- [ ] `bun run lint:check` passes
- [ ] `bun run typecheck` passes
- [ ] Docker build passes (validated by CI or `docker build .` locally)

## Breaking changes

<!-- List any breaking changes: new required env vars, renamed/removed commands, schema changes requiring data migration, changed API contracts -->

None.

## Screenshots / logs

<!-- Optional: attach relevant output, embed screenshots, or paste log snippets as evidence -->
