# Security

## Threat → control

| Threat | Control |
|---|---|
| CSRF | Yoga CSRF plugin: simple (non-JSON) requests require the `x-graphql-yoga-csrf` header; `application/json` POSTs pass; CORS is never `*` |
| CORS abuse | Exact allowlist function (unknown origins get no headers, never reflected), `credentials: true`, methods `GET, POST, OPTIONS`, headers `Content-Type` + CSRF header, `maxAge` 600; Yoga's own CORS is disabled (it would reflect any origin) |
| Brute force on sign-in | 10 attempts / 15 min per IP **and** per email, checked before hashing; generic error either way |
| Brute force on sign-up | 5 attempts / hour per IP, separate budget so sign-ups can't lock out sign-ins |
| Request flooding | 300 requests / minute per IP on `/graphql` (after CORS, so preflights aren't counted) → 429 JSON with `Retry-After` |
| User enumeration | Identical `"Invalid email or password"` (no field errors) for wrong passwords and unknown emails; unknown emails burn one scrypt like real attempts; other users' resources return `NOT_FOUND` |
| Session theft | 32 random bytes per token, `HttpOnly` cookie, only the SHA-256 stored; rotation on every sign-in; sliding expiry; `Secure` + `__Host-` prefix in production; same-site deployment (`api.` + `app.`) with `SameSite=Lax` |
| DoS by query | Armor: depth 8, aliases 10, directives 20, tokens 2000, cost budget 1000 (literal `first` multiplies; variables don't) |
| DoS by body | 100 KB limit → 413 JSON |
| DoS by scrypt | Passwords capped at 128 chars; sign-up throttled; `maxmem` 64 MiB bounds each hash |
| IDOR / ownership | Authorization in services (`viewer` required), owner scoping in repositories, cross-user access → `NOT_FOUND` |
| Injection | All queries through parameterized Drizzle; `ILIKE` wildcards (`%`, `_`) escaped; Zod validation on every input; cursors Zod-validated |
| Info leakage | `maskError`: `AppError` codes preserved, everything else → `INTERNAL_SERVER_ERROR` (`"Unexpected error"`, always, no stack); introspection and field suggestions off in production; error stacks only outside production |
| Supply chain | pnpm lockfile + `allowBuilds` (only esbuild); CI audits `@app/api` prod deps at `high`; one narrow release-age exception (`graphql-yoga@5.24.4`, temporary, same publisher) |

## CORS

- **Origins**: exact allowlist from `CORS_ORIGINS`. Never `*`, never reflected.
- **Methods**: `GET`, `POST`, `OPTIONS`.
- **Headers**: `Content-Type` + `x-graphql-yoga-csrf`.
- **Credentials**: `true` (cookies).
- **Dev**: `http://localhost:5173`. **Prod**: `https://app.<domain>` (must be `https://`).

## Rate limits

| Scope | Budget | Key |
|---|---|---|
| `signIn` | 10 / 15 min | IP and email (either trips) |
| `signUp` | 5 / hour | IP |
| `/graphql` general | 300 / minute | IP |

Exceeded auth attempts → `RATE_LIMITED`; exceeded `/graphql` → 429 JSON `{ error: "Too many requests" }` with `Retry-After` seconds. Client IP comes from `CF-Connecting-IP` only when `TRUST_PROXY=cloudflare`; otherwise the socket address is used and forwarding headers are ignored.

## Cookies

Production: `__Host-session`, `HttpOnly; Secure; SameSite=Lax; Path=/`, `Max-Age` from `SESSION_TTL_DAYS`. Development/test: `session` without `Secure` (plain `http://localhost`). Sign-out clears with `Max-Age=0`.

## Password storage

scrypt with N=2¹⁵, r=8, p=1, 16-byte random salt, 64-byte key, `maxmem` 64 MiB. Format `scrypt$N$r$p$saltB64$hashB64` carries its params, so cost can be raised later without breaking old hashes. Comparison with `timingSafeEqual`. Minimum password length 12.

## Logging

No secrets in logs: keys containing `password`, `cookie`, `authorization` or `token` (case-insensitive, any depth) are redacted; error stacks are excluded unless explicitly enabled outside production. Access logs record method, path, status and duration only — never bodies or cookies.

## Not covered

- The limiter is in-memory and single-instance: budgets reset on restart and don't replicate. Move to a shared store if the API ever scales horizontally (migrations would need a release step then too).
- Pagination cursors are signed by nobody: they are opaque but not tamper-proof. They are strictly validated (`createdAt` datetime + `id` uuid), so tampering only yields `BAD_USER_INPUT`, never data access.
