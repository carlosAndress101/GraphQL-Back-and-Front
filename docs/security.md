# Security

## Configuration

Environment variables are validated at startup. The process fails fast on bad config. No secrets in logs (redaction of `password`, `cookie`, `authorization`, `token`).

## HTTP

- **CORS**: exact allowlist from `CORS_ORIGINS`, `credentials: true`, methods `GET, POST, OPTIONS`, headers `Content-Type` + `x-graphql-yoga-csrf`. Never `*`.
- **Headers**: `secureHeaders` middleware (Hono).
- **Body limit**: 100 KB.
- **CSRF**: Yoga's CSRF prevention requires the `x-graphql-yoga-csrf` header (or `Content-Type: application/json`).

## GraphQL

- **Armor**: `@escape.tech/graphql-armor` limits depth, cost, aliases, directives, and tokens. `first` ≤ 100.
- **Masking**: unexpected errors become `INTERNAL_SERVER_ERROR` with no stack.
- **Introspection**: off in production.
- **Trusted documents**: persisted operations in production; unknown operations rejected.

## Sessions

- 32-byte random token in an `HttpOnly; Secure; SameSite=Lax; Path=/` cookie.
- Only the SHA-256 hash is stored.
- Passwords hashed with `scrypt` + salt; comparison uses `timingSafeEqual`.
- Generic error message on auth failure.
- Sliding expiration; rotation on `signIn`; deletion on `signOut`.

## Rate limiting

In-memory (single instance). Strict on `signIn`/`signUp` (IP + email). General per IP on `/graphql`. Client IP from `CF-Connecting-IP` only when `TRUST_PROXY=cloudflare`.

## Queries

All queries go through Drizzle (parameterized). `ILIKE` searches escape `%` and `_`.

## Audit

CI runs `pnpm --filter @app/api audit --prod --audit-level high`. The legacy web app is excluded until the phase 4 rewrite. See `docs/dependencies.md`.

## TODO

- TODO(round 2): session and password implementation.
- TODO(round 3): CORS, armor, masking, CSRF, trusted documents.
