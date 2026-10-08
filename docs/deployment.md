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

## Environment

Set in Dokploy (every variable is validated at startup; the process exits on bad config):

- `NODE_ENV=production`
- `PORT=4000` (or the platform port)
- `DATABASE_URL` (Neon `main` branch, `sslmode=require`)
- `CORS_ORIGINS=https://app.<domain>` (https only, enforced)
- `SESSION_TTL_DAYS=30`
- `TRUST_PROXY=cloudflare`
- `LOG_LEVEL=info`
- `OTEL_EXPORTER_OTLP_ENDPOINT` (optional; unset = no telemetry)
- `PERSISTED_DOCUMENTS_PATH` (required — fail fast without it)

## Migration strategy

The container migrates before serving on every start (`db:migrate:prod` runs the same committed SQL as local `db:migrate`, via `src/migrate.ts`). The process exits non-zero when migrations fail, so a bad migration blocks the deploy instead of serving against a stale schema. This is safe because Dokploy runs a single API instance; with multiple instances, migrations must move to a separate release step run once per deploy.

## Cloudflare Pages

- Build command: `pnpm --filter @app/web build` (typecheck + Vite + Pages file generation).
- Output directory: `apps/web/dist`.
- `VITE_API_URL`: required at build time — the build fails without it, so a misconfigured deploy can never silently point at localhost. Must be `https:` except `http://localhost`/`http://127.0.0.1` for local builds; baked into the `_headers` CSP `connect-src`.
- Custom domain: `app.<domain>`.
- `_headers` and `_redirects` are generated at build time by `apps/web/scripts/write-pages-files.ts`: strict CSP (no `unsafe-inline` — the build emits no inline scripts/styles), HSTS, nosniff, referrer and permissions policies, same-origin opener, immutable caching for `/assets/*`, `no-cache` for `/index.html`, SPA fallback `/* /index.html 200`.

## Health checks

- `/health/live` → 200 when the process is alive. Use it for the container/Dokploy health check.
- `/health/ready` → 200 only when the database ping succeeds, 503 otherwise (no error details). Use it for readiness gates.

## Deploy order

Deploy the **API before the web**. The API loads `persisted-documents.json` at startup. If the web deploys first with new operations, the API rejects them until it is updated.

## Rollback

Redeploy the previous image tag. Migrations are forward-only SQL with no down path: rolling back code does not roll back schema, so additive, backward-compatible migrations are the rule, and any destructive change needs explicit user approval first.

## Tunnel

Cloudflare Tunnel (`cloudflared`) routes `api.<domain>` to the Dokploy service. No public IP required.

In the tunnel's public hostname, map `api.<domain>` to the API service's internal URL (port `PORT`, default 4000). Set `TRUST_PROXY=cloudflare` so rate limits use `CF-Connecting-IP`, and `CORS_ORIGINS=https://app.<domain>`.
