# Development

## Commands

All commands use pnpm. Run from the repo root unless noted.

| Command                                      | What it does                                    |
| -------------------------------------------- | ----------------------------------------------- |
| `pnpm dev`                                   | Starts API (watch) and web (legacy) in parallel |
| `pnpm --filter @app/api dev`                 | API only, with `node --watch`                   |
| `pnpm typecheck`                             | `tsc --noEmit` across workspaces                |
| `pnpm lint`                                  | oxlint                                          |
| `pnpm fmt`                                   | oxfmt (write)                                   |
| `pnpm fmt:check`                             | oxfmt (check only)                              |
| `pnpm test`                                  | vitest across workspaces                        |
| `pnpm --filter @app/api test`                | API tests only                                  |
| `pnpm --filter @app/api codegen`            | Regenerate GraphQL resolver types (commit them) |
| `pnpm --filter @app/api db:generate`         | Generate a Drizzle migration                    |
| `pnpm --filter @app/api db:migrate`          | Apply migrations locally                       |
| `pnpm --filter @app/api db:migrate:prod`     | Apply migrations like production does           |

## Neon dev-branch workflow

1. Create the Neon project once, then a branch named `dev`.
2. Put its connection string (`sslmode=require`) in `apps/api/.env` as `DATABASE_URL` (copied from `.env.example`).
3. `db:generate` after schema changes, review the SQL, `db:migrate` to apply. Never `drizzle-kit push`.
4. Tests ignore Neon entirely — they boot PGlite.

## GraphiQL in dev

Open `http://localhost:4000/graphql` in the browser. `application/json` requests work without extra headers; form-encoded exploration needs the `x-graphql-yoga-csrf: 1` header. Sign in through the UI first for authenticated queries — the session cookie is attached automatically.

## Adding a dependency

Only approved dependencies (see `architecture-baseline.md` via the orchestrator, `docs/dependencies.md` for the list). Anything else needs a PROPOSAL first:

```sh
pnpm --filter @app/api add <package>
pnpm --filter @app/api add -D <package>
```

## Watch mode

The API runs `.ts` directly with Node 24 native type stripping. `node --watch` restarts on file changes. No build step. Relative imports must use `.ts` extensions; only erasable syntax; `import type` for types.

## Logging

Use `createLogger` from `apps/api/src/infrastructure/logging/logger.ts`. Pass `includeErrorStack: env.NODE_ENV !== "production"` when wiring the logger in `server.ts` so stacks appear in development but never in production. Every request logs one access line (method, path, status, duration in ms, correlated by `requestId`); operation-level fields (operation name, error codes) ride the same child logger.

## TODO

- TODO(round 5): frontend development workflow.
