# Database

PostgreSQL via Neon in development and production. PGlite in tests.

## Branches

- **Dev**: Neon branch `dev`. Connection string in `DATABASE_URL`.
- **Prod**: Neon branch `main`.
- **Tests**: PGlite (in-process, no network).

## Schema

Defined in `apps/api/src/infrastructure/database/schema.ts` (Drizzle).

- `users(id, email unique, password_hash, created_at)`
- `sessions(id_hash pk, user_id fk cascade, expires_at)` + index on `user_id`
- `projects(id, owner_id fk cascade, name, description, created_at, updated_at)` + index `(owner_id, created_at, id)`
- `tasks(id, project_id fk cascade, title, completed, created_at, updated_at)` + index `(project_id, created_at, id)`

Foreign keys use `ON DELETE CASCADE`. Deleting a user removes their sessions and projects; deleting a project removes its tasks.

## Migrations

```sh
pnpm --filter @app/api db:generate      # drizzle-kit generate → SQL files
pnpm --filter @app/api db:migrate       # local/dev: drizzle-kit migrate
pnpm --filter @app/api db:migrate:prod  # production: node src/migrate.ts
```

Never use `drizzle-kit push`. Migrations are versioned SQL committed to the repo.

### Migration strategy

- **Local/dev/tests**: `drizzle-kit migrate` against the Neon `dev` branch; PGlite suites migrate an empty database per test run.
- **Production**: `src/migrate.ts` — a standalone script that validates env, runs the same committed SQL through the Drizzle node-postgres migrator, logs with the structured logger, closes the pool, and exits non-zero on failure. The Docker image runs it before the server on every container start. Single instance on Dokploy, so concurrent runs cannot race; if the API ever scales to multiple instances, move migrations to a separate release step.

## Connections

One `pg.Pool` per process, created in `server.ts`, closed on `SIGTERM`/`SIGINT`. SSL is required in production (`sslmode=require` in the connection string).
