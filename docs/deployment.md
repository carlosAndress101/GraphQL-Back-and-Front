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
- Starts with `node --import ./src/instrumentation.ts src/server.ts`.

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
