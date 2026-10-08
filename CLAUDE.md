# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Notion-inspired project/task manager built as a learning reference for a production-grade GraphQL API. pnpm 12 workspace, Node 24:

- `apps/api` — Hono + GraphQL Yoga (schema-first SDL), PostgreSQL via Drizzle (Neon in dev/prod, PGlite in tests), Zod, own cookie sessions. Runs `.ts` directly with Node's native type stripping (no build step).
- `apps/web` — React 19 + TanStack Router (file-based) + TanStack Query + Tailwind 4, Vite. Talks to the API through typed documents from graphql-codegen (no GraphQL client library).

Design decisions live in `docs/adr/` (decision-log format); read the relevant ADR before changing an architectural choice. Topic docs: `docs/*.md`.

## Commands

```bash
pnpm install
pnpm dev                 # api (:4000) + web (:5173)
pnpm typecheck           # tsc --noEmit in every app
pnpm lint                # oxlint (whole repo)
pnpm fmt / pnpm fmt:check
pnpm test                # vitest in every app
pnpm codegen             # api resolver types + web typed documents/persisted manifest

pnpm --filter @app/api test -- test/graphql-projects.test.ts   # one file
pnpm --filter @app/api test -- -t "rejects duplicate emails"    # one test by name
pnpm --filter @app/api db:generate    # SQL migration from schema.ts (never `push`)
pnpm --filter @app/api db:migrate     # apply to DATABASE_URL (Neon dev branch)
VITE_API_URL=http://localhost:4000/graphql pnpm --filter @app/web build
```

Env: `apps/api/.env` from `.env.example` (validated by Zod in `src/infrastructure/config/env.ts`; the process fails fast on bad config). `apps/web/.env` needs `VITE_API_URL`. Nothing (Docker/Postgres) is installed locally: tests use PGlite, dev uses a Neon branch.

## Architecture rules

- **Request flow:** Hono middlewares (CORS allowlist, per-IP rate limit, secure headers, body limit) → Yoga (CSRF header `x-graphql-yoga-csrf`, graphql-armor limits, persisted operations in prod, masked errors) → per-request context (`viewer` from the session cookie, services, DataLoaders) → resolvers → services → repositories → Drizzle.
- **Resolvers** (`src/graphql/resolvers/*`) are 1–3 lines calling a service with `context.viewer`. No business logic, no DB access.
- **Services** (`src/modules/*/*.service.ts`) own validation (`parseInput` + Zod schemas in `*.schema.ts`), authorization and `AppError`s (`src/lib/errors.ts`: `UNAUTHENTICATED`, `NOT_FOUND`, `BAD_USER_INPUT`, `RATE_LIMITED`). Another user's resource is `NOT_FOUND`, never `FORBIDDEN`.
- **Repositories** are the only code importing Drizzle tables; every query is scoped by `ownerId`. Domain types (`*.types.ts`) are plain TS, structurally compatible with Drizzle rows. Type DB handles as `Database` (works for `pg` and PGlite).
- **N+1:** relations go through per-request DataLoaders in `src/graphql/loaders.ts`. End-to-end tests assert SQL query counts with the PGlite query counter — keep them passing when touching resolvers.
- **Schema changes:** edit `src/graphql/schema.graphql`, run `pnpm codegen`, commit generated files (`apps/api/src/graphql/__generated__/`, `apps/web/src/gql/` incl. `persisted-documents.json`). CI fails on manifest drift. Production only executes operations in that manifest, so deploy the API before the web.
- **Pagination:** keyset `(created_at, id)` with opaque cursors, `first` 1–100. Tasks are intentionally not reorderable (ADR 0011).
- **API code style:** relative imports with `.ts` extensions, erasable syntax only (no enums/parameter properties), `import type` for types, no `any`/`as` escapes/non-null `!`, no `process.env` outside `env.ts`/`instrumentation.ts`/`migrate.ts`.
- **Web:** routes stay thin; data access in `src/features/*` hooks with keys from `src/lib/query-keys.ts`; `src/components/{ui,layout}` are presentational (no fetching, no router imports). Style with the semantic Tailwind tokens from `src/styles.css`, never raw hex.
- **graphql is pinned to v16** (graphql-armor compatibility, ADR 0010).

## Workflow

Conventional commits, no AI attribution in commits. New dependencies need a justification (see `docs/dependencies.md`).
