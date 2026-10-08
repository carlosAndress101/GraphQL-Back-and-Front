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
pnpm --filter @app/api db:generate   # drizzle-kit generate → SQL files
pnpm --filter @app/api db:migrate    # apply pending migrations
```

Never use `drizzle-kit push`. Migrations are versioned SQL committed to the repo.

## Connections

One `pg.Pool` per process, created in `server.ts`, closed on `SIGTERM`/`SIGINT`. SSL is required in production (`sslmode=require` in the connection string).

## TODO

- TODO(round 1): migration files and the PGlite test helper (Dev1).
- TODO(round 2): session repository details.
