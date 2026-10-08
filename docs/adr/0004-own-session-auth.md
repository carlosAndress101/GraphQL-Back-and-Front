# ADR 0004: Own session auth

## Context

The original app had no authentication. Anyone could read or delete anything.

## Decision

Own sessions: a 32-byte random token in an `HttpOnly; Secure; SameSite=Lax; Path=/` cookie. Only the SHA-256 hash is stored. Passwords use `scrypt` (Node.js `crypto`).

## Options

- **JWT**: stateless, but revocation is hard and the token is larger.
- **Third-party auth (Auth.js, Clerk)**: adds a dependency and hides the mechanics we want to learn.
- **OAuth only**: no password flow for a learning project.

## Reason

Sessions are simple, revocable, and testable. Storing only the hash means a database leak does not expose live tokens. `scrypt` is built into Node.js; no extra dependency.

## Consequences

- Session table with `id_hash` as primary key.
- Cookie flags are fixed; `SameSite=Lax` works because the API and web are same-site.
- Rotation on `signIn`, deletion on `signOut`.

## Date

2026-10-08
