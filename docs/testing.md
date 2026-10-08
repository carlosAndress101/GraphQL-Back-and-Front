# Testing

Vitest 5. Unit tests live next to sources where Dev1 put them (`errors.test.ts`); most API tests live in `apps/api/test/`.

## Running

```sh
pnpm test                        # all workspaces
pnpm --filter @app/api test       # API only
pnpm --filter @app/api test:watch # watch mode
```

## Strategy

- **Unit**: pure functions with injected clocks — password hashing, session tokens, credentials schema, session cookie contract, rate limiter, client IP, cursor encoding, `parseInput` error shaping.
- **Integration**: PGlite (in-process Postgres) + real repositories + `app.request()`. Auth flows end to end (signup → cookie → me → signout), ownership across two users, cascade on delete, pagination stability, masked errors, cookie flags, CSRF/CORS behavior.
- **Security**: unlisted origins get no CORS headers, preflight correctness, introspection off in production, armor limits (depth/aliases/directives/tokens/cost), CSRF header required, cookie flags, sign-in rate limits by IP and email.

## PGlite

Integration tests use `@electric-sql/pglite` — a WASM Postgres that runs in-process. No Docker, no local Postgres install. `test/database.ts` (`createTestDatabase`) applies the real migrations to a fresh database per test and exposes `queryCount`/`resetQueryCount`.

## Query counting for N+1

Wrap the operation, then assert the statement count:

```ts
resetQueryCount();
await serviceCall();
expect(queryCount()).toBe(2);
```

DataLoader batching is proven the same way: N nested relations must not cost N queries.

## HTTP tests

Use Hono's `app.request()` (no socket — client IP resolves to `"unknown"` unless tests run behind `TRUST_PROXY=cloudflare` with a `CF-Connecting-IP` header):

```ts
const res = await app.request("/health/live");
expect(res.status).toBe(200);
```

## Vitest config rationale

`apps/api/vitest.config.ts` sets 30 s `testTimeout`/`hookTimeout` and `maxWorkers: 2`. Each scrypt costs ~100 ms and 32 MiB, each test file boots its own PGlite, and other agents share this machine — unbounded parallelism made the suite flake on timeouts. Deterministic beats fast; five consecutive green runs are on record.

## Test map

| File(s)                                                                                   | Protects                                                                                                 |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `app.test.ts`                                                                             | Composition: auth flows, cookie flags, CSRF/CORS, health, masking, general rate limit                    |
| `graphql-security.test.ts`, `http-security.test.ts`                                       | CSRF, introspection, persisted ops, armor limits, `maskError`, CORS/headers/body-limit/cache             |
| `auth.service.test.ts` (+ PGlite)                                                         | Signup/signin/signout, rotation, sliding expiry, rate limits, identical auth errors, no cleartext tokens |
| `password`, `session-token`, `auth.schema`, `session-cookie` tests                        | Hashing/verify/params, token shape/SHA-256, validation + normalization, cookie contract                  |
| `rate-limit`, `client-ip`, `cursor` tests                                                 | Window/keys/pruning, proxy trust, cursor encode/decode                                                   |
| `project/task.service.test.ts`, `*.repository.test.ts`, `user-session.repository.test.ts` | Business rules, authz, ownership, cascades, pagination, N+1 counts                                       |
| `database.test.ts`, `domain-types.typecheck.ts`                                           | Migration smoke + query counting; Drizzle rows fit domain types (compile-time)                           |
| `logger`, `health`, `instrumentation`, `scalars`, `errors` tests                          | Redaction/levels, liveness/readiness, ESM OTel spans, DateTime, `parseInput` shaping                     |

## What we don't test

- `apps/web` (legacy) until the phase 4 rewrite.
- Docker image build and real Neon (verified in CI, not locally).
- `src/migrate.ts` against a live database (same reason).
