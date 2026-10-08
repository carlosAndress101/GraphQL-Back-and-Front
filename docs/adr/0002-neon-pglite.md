# ADR 0002: Neon for dev/prod, PGlite for tests

## Problem

We cannot install PostgreSQL or Docker on the development machine. Tests need a real Postgres, not a mock.

## Decision

- **Dev/prod**: Neon (serverless Postgres) via `DATABASE_URL`. Dev uses a branch named `dev`; prod uses `main`.
- **Tests**: PGlite (`@electric-sql/pglite`), an in-process WASM Postgres.

## Alternatives considered

- **Local Postgres**: forbidden by the constraint.
- **Docker Postgres**: forbidden by the constraint.
- **SQLite for tests**: different SQL dialect; would hide Postgres-specific bugs.

## Reason

Neon requires no local install and is portable to any Postgres. PGlite runs the same SQL as production without network or containers. Each test suite gets an isolated database.

## Consequences

- `DATABASE_URL` must include `sslmode=require` for Neon.
- PGlite does not support concurrent connections the way a server does; CI can add a Neon test branch later if needed.
- No `docker-compose` for local development.
