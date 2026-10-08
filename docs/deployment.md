# Deployment

## Topology

- **API**: Docker image built by Dokploy, exposed via Cloudflare Tunnel at `api.<domain>`.
- **Web**: Cloudflare Pages at `app.<domain>`.
- **Database**: Neon (branch `main` in production).

Same-site deployment (`api.<domain>` and `app.<domain>`) means the session cookie is first-party with `SameSite=Lax`.

## Build

The Docker build context is the **repository root**:

```sh
docker build -f apps/api/Dockerfile -t graphql-api .
```

The image:

- Uses `node:24-slim`.
- Installs only production dependencies of `@app/api`.
- Runs as the `node` user.
- Exposes port 4000.
- Health check hits `/health/live` using Node's built-in `fetch` (no curl).
- Starts with migrations, then the server: `node src/migrate.ts && exec node --import ./src/instrumentation.ts src/server.ts`.

## Migration strategy

The container migrates before serving on every start (`db:migrate:prod` runs the same committed SQL as local `db:migrate`, via `src/migrate.ts`). The process exits non-zero when migrations fail, so a bad migration blocks the deploy instead of serving against a stale schema. This is safe because Dokploy runs a single API instance; with multiple instances, migrations must move to a separate release step run once per deploy.

## Environment

Set in Dokploy:

- `NODE_ENV=production`
- `DATABASE_URL` (Neon `main` branch, `sslmode=require`)
- `CORS_ORIGINS=https://app.<domain>`
- `TRUST_PROXY=cloudflare`
- `OTEL_EXPORTER_OTLP_ENDPOINT` (optional, e.g. Grafana Cloud)

## Deploy order

Deploy the **API before the web**. The API loads `persisted-documents.json` at startup. If the web deploys first with new operations, the API rejects them until it is updated.

## Tunnel

Cloudflare Tunnel (`cloudflared`) routes `api.<domain>` to the Dokploy service. No public IP required.

## TODO

- TODO(round 6): Cloudflare Pages `_headers` and `_redirects`.
- TODO(round 5): exact tunnel and domain configuration once the domain is chosen.
