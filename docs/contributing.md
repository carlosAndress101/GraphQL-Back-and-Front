# Contributing

## Branches

Work on a feature branch. The orchestrator merges into `refactor/modernization`.

## Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(api): add health check routes
fix(db): escape ILIKE wildcards
docs: add deployment guide
```

Do not add `Co-Authored-By` or any attribution trailer.

## Pull requests

Before opening a PR:

```sh
pnpm typecheck
pnpm lint
pnpm fmt:check
pnpm test
```

All must pass. Keep PRs focused. If a change exceeds ~400 lines, consider splitting.

## Docs

Update the relevant doc in `docs/` when you change behavior. ADRs go in `docs/adr/`.

## Dependencies

Only add dependencies that are approved in the architecture baseline. If you need a new one, propose it first.
