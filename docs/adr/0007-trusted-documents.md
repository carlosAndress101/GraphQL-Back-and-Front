# ADR 0007: Trusted documents, no server response cache

## Context

GraphQL APIs are vulnerable to arbitrary query abuse. Response caching is tempting but dangerous for per-user private data.

## Decision

- **Production**: trusted documents. The client preset generates `persisted-documents.json` (sha256 → operation). The API loads it at startup and rejects unknown operations.
- **No server response cache**. Data is private per user. DataLoader caches per request; TanStack Query caches on the client.

## Options

- **Allow any query**: simple, but enables depth/cost attacks even with armor.
- **Server response cache (e.g. Yoga response cache)**: would need per-user cache keys and invalidation; complexity outweighs benefit for this scale.
- **Automatic persisted queries (APQ)**: still allows arbitrary queries on first sight; we want a closed set.

## Reason

Trusted documents close the query surface. The API only executes operations it has seen at build time. No response cache means no risk of serving one user's data to another.

## Consequences

- Deploy the API before the web so new operations are known.
- `Cache-Control: private, no-store` on authenticated responses.
- Revisit response caching only with metrics that justify it.

## Date

2026-10-08
