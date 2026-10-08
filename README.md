# GraphQL-Back-and-Front

A project and task manager. GraphQL API (Hono + Yoga) with PostgreSQL, and a React dashboard.

## Stack

- **API**: Node 24, Hono, GraphQL Yoga, Drizzle, PostgreSQL (Neon), Zod, Vitest
- **Web**: React 19, TanStack Router, TanStack Query, Tailwind 4 (Cloudflare Pages)
- **Tooling**: pnpm 12, TypeScript 7, oxlint, oxfmt

## Quick start

```sh
corepack enable
pnpm install
cp apps/api/.env.example apps/api/.env
# Set DATABASE_URL to your Neon dev branch connection string.
pnpm --filter @app/api db:migrate
pnpm dev
```

- API: http://localhost:4000
- Web: http://localhost:5173

## Docs

- [Architecture](docs/architecture.md)
- [Getting started](docs/getting-started.md)
- [Environment](docs/environment.md)
- [Frontend](docs/frontend.md)
- [Development](docs/development.md)
- [Testing](docs/testing.md)
- [Database](docs/database.md)
- [GraphQL](docs/graphql.md)
- [Security](docs/security.md)
- [Deployment](docs/deployment.md)
- [Contributing](docs/contributing.md)
- [Dependencies](docs/dependencies.md)
- [ADRs](docs/adr/)
