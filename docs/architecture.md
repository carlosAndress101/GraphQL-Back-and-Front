# Architecture

Monorepo with pnpm workspaces. `apps/api` is the new TypeScript API; `apps/web` is the legacy React client (rewritten in phase 4).

## Layers

```
GraphQL (SDL) → resolvers → services → repositories → Drizzle → PostgreSQL
```

- **Resolver**: translates GraphQL ↔ service; 1–3 lines, no business logic, no DB access.
- **Service**: validates with Zod, applies authorization (`viewer` required, ownership), throws `AppError`.
- **Repository**: only module that imports Drizzle; returns domain types. Typed against `PgDatabase` so both `pg` and PGlite work without casts.

## Request lifecycle

1. HTTP request hits Hono.
2. Middleware: CORS, secure headers, body limit.
3. GraphQL Yoga parses the operation (or loads a trusted document in production).
4. Context is built: `{ db, services, loaders, viewer, cookies }`.
5. Resolver calls the service; service calls the repository.
6. Response is masked (errors) and returned.

## Folder structure

```
apps/api/src/
  graphql/
    schema.graphql          # SDL: source of truth
    resolvers.ts            # map Query/Mutation/Project/Task/User
    context.ts              # { db, services, loaders, viewer, cookies }
    loaders.ts              # DataLoaders per request
    errors.ts               # AppError → GraphQLError
    __generated__/          # graphql-codegen output
  modules/
    auth/                   # password, sessions, cookies
    users/
    projects/
    tasks/
  infrastructure/
    config/env.ts           # Zod-validated environment
    database/               # schema.ts, client.ts, migrations/
    logging/logger.ts
  lib/                      # cursor.ts, rate-limit.ts
  app.ts                    # createApp(deps): Hono + middlewares + Yoga
  server.ts                 # startup, connection, graceful shutdown
  instrumentation.ts        # OpenTelemetry bootstrap (node --import)
  http/health.ts            # /health/live, /health/ready
```

## Cross-cutting

- **Config**: `env.ts` parses `process.env` once at startup; passed down explicitly.
- **Logging**: structured JSON logger with redaction; per-request child logger.
- **Health**: `/health/live` (always 200), `/health/ready` (DB ping).
- **Observability**: OpenTelemetry traces + metrics via OTLP when `OTEL_EXPORTER_OTLP_ENDPOINT` is set.

## TODO

- TODO(round 3): `app.ts` composition, error mapping, GraphQL context wiring.
- TODO(round 4–6): frontend architecture (TanStack Router, Query, design system).
