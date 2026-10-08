# Getting started

## Prerequisites

- Node.js 24 (see `.nvmrc`). Use `nvm use` or install from [nodejs.org](https://nodejs.org).
- pnpm 12. Enable with `corepack enable` (ships with Node 24).

## Setup

```sh
git clone <repo>
cd GraphQL-Back-and-Front
pnpm install
```

## Database

Create a Neon project and a branch named `dev`. Copy the connection string.

```sh
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env: set DATABASE_URL to your Neon dev branch connection string.
```

Run migrations:

```sh
pnpm --filter @app/api db:migrate
```

## Run

```sh
pnpm dev
```

- API: `http://localhost:4000`
- Web (legacy): `http://localhost:5173`

Verify:

```sh
curl http://localhost:4000/health/live
curl http://localhost:4000/health/ready
```

## TODO

- TODO(round 1): exact migration command output once Dev1 lands the migration files.
