# Testing

Vitest 5. Tests live in `apps/api/test/`.

## Running

```sh
pnpm test                  # all workspaces
pnpm --filter @app/api test
pnpm --filter @app/api test:watch
```

## Strategy

- **Unit**: services (Zod rules, authz, errors), password hashing, cursor encoding, rate limiter.
- **Integration**: PGlite (in-process Postgres) + `app.request()`. Each GraphQL operation, ownership across two users, cascade on delete, pagination stability, N+1 query counts, masked errors.
- **Security**: CORS rejects unlisted origins, preflight correctness, introspection off in production, depth/cost limits, CSRF header required, cookie flags, rate limit on sign-in.

## PGlite

Integration tests use `@electric-sql/pglite` — a WASM Postgres that runs in-process. No Docker, no local Postgres install. Each test suite gets a fresh database.

## HTTP tests

Use Hono's `app.request()`:

```ts
const res = await app.request("/health/live");
expect(res.status).toBe(200);
```

## What we don't test

- `apps/web` (legacy) until the phase 4 rewrite.
- Docker image build (verified in CI, not locally).

## TODO

- TODO(round 1): PGlite test helper once Dev1 lands it.
- TODO(round 3): GraphQL integration test helpers.
