# ADR 0010: Pin graphql 16 for graphql-armor

## Context

Query depth/alias/directive/token/cost limits are a user requirement, and graphql-armor is the baseline's named mechanism. Round 3 found armor uninstallable on graphql 17: the latest release (3.2.0) and every sub-package declare `graphql: ^16.10.0` as a direct dependency, so installing it would nest a second graphql copy beside 17 and break validation/instanceof interop.

## Options

- **A. Pin the whole API to graphql 16**: cheap now (no GraphQL layer exists yet), surrenders graphql 17 features we don't use.
- **B. Hand-rolled envelop validation rules**: depth is small; cost needs field-cost accounting against `first` — real work duplicating a maintained library.
- **C. Ship without armor, wait for upstream graphql-17 support**: disables a required protection.

## Decision

Option A: `graphql@^16` (16.14.2) for `@app/api`. Install `@escape.tech/graphql-armor` 3.2.0.

## Reason

Depth/complexity limits are required; option C disables them and option B duplicates maintained code. graphql 17 gives this project nothing it uses, and with no GraphQL layer built yet the downgrade touches one line plus the lockfile. The API tree resolves to a single graphql 16 copy (verified with `pnpm --filter @app/api list graphql`).

## Consequences

- Armor limits active in every environment: maxDepth 8, maxAliases 10, maxDirectives 20, maxTokens 2000, costLimit `maxCost` 1000 (provisional; re-measure against the real schema), field suggestions blocked in production.
- Future graphql-codegen setup must target graphql 16.
- The repo still contains graphql 17, but only under legacy `apps/web` (via `@apollo/client`) until the phase 4 rewrite.
- Revisit when graphql-armor supports graphql 17.

## Date

2026-10-08
