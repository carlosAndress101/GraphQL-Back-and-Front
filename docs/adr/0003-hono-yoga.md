# ADR 0003: Hono + GraphQL Yoga

## Problem

Express 4 and Apollo Server 4 are end-of-life. The original GraphQL style (SDL + resolver map) is clear and worth keeping.

## Decision

Hono for HTTP, GraphQL Yoga for GraphQL. The SDL remains the source of truth; resolvers stay a map per type.

## Alternatives considered

- **Stay on Express + Apollo**: both EOL, security advisories, no path forward.
- **Fastify + Mercurius**: viable, but Hono's Fetch-native model and built-in middleware fit better.
- **NestJS**: too much ceremony for this codebase.

## Reason

Hono is Fetch-native, has built-in `cors`, `secureHeaders`, and `bodyLimit`, and tests with `app.request()`. Yoga provides error masking, CSRF prevention, and a plugin system (Envelop) without abandoning the SDL + resolver map style.

## Consequences

- Resolvers stay thin (1–3 lines).
- Yoga plugins (CSRF, persisted operations, OpenTelemetry) are added in later rounds.
- The HTTP layer is swappable if we ever leave Node.
