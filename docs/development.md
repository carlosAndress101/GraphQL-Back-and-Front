# Development

## Commands

All commands use pnpm. Run from the repo root unless noted.

| Command                              | What it does                                    |
| ------------------------------------ | ----------------------------------------------- |
| `pnpm dev`                           | Starts API (watch) and web (legacy) in parallel |
| `pnpm --filter @app/api dev`         | API only, with `node --watch`                   |
| `pnpm typecheck`                     | `tsc --noEmit` across workspaces                |
| `pnpm lint`                          | oxlint                                          |
| `pnpm fmt`                           | oxfmt (write)                                   |
| `pnpm fmt:check`                     | oxfmt (check only)                              |
| `pnpm test`                          | vitest across workspaces                        |
| `pnpm --filter @app/api test`        | API tests only                                  |
| `pnpm --filter @app/api db:generate` | Generate a Drizzle migration                    |
| `pnpm --filter @app/api db:migrate`  | Apply migrations                                |

## Adding a dependency

```sh
pnpm --filter @app/api add <package>
pnpm --filter @app/api add -D <package>
```

## Watch mode

The API runs `.ts` directly with Node 24 native type stripping. `node --watch` restarts on file changes. No build step.

## Logging

Use `createLogger` from `apps/api/src/infrastructure/logging/logger.ts`. Pass `includeErrorStack: env.NODE_ENV !== "production"` when wiring the logger in `server.ts` so stacks appear in development but never in production.

## TODO

- TODO(round 3): GraphQL operation logging (requestId, operationName, duration, error codes).
- TODO(round 5): frontend development workflow.
