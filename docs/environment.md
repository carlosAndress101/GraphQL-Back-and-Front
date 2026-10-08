# Environment variables

Validated at startup by `apps/api/src/infrastructure/config/env.ts`. The process exits if any required variable is missing or invalid.

| Variable                      | Meaning                                                                | Default       | Dev                     | Prod                                    |
| ----------------------------- | ---------------------------------------------------------------------- | ------------- | ----------------------- | --------------------------------------- |
| `NODE_ENV`                    | Runtime mode                                                           | `development` | `development`           | `production`                            |
| `PORT`                        | HTTP port                                                              | `4000`        | `4000`                  | `4000`                                  |
| `DATABASE_URL`                | PostgreSQL connection string (Neon)                                    | —             | Neon `dev` branch       | Neon `main` branch                      |
| `CORS_ORIGINS`                | Comma-separated exact origins allowed to call the API with credentials | —             | `http://localhost:5173` | `https://app.<domain>`                  |
| `SESSION_TTL_DAYS`            | Session lifetime in days                                               | `30`          | `30`                    | `30`                                    |
| `TRUST_PROXY`                 | Trust `CF-Connecting-IP` for client IP                                 | `none`        | `none`                  | `cloudflare`                            |
| `LOG_LEVEL`                   | Minimum log level                                                      | `info`        | `debug` or `info`       | `info`                                  |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTLP collector base URL; unset = telemetry off                         | —             | unset                   | `https://otlp-gateway.example.com/otlp` |
| `PERSISTED_DOCUMENTS_PATH`    | Path to the persisted-documents manifest; required in production       | —             | unset                   | `./persisted-documents.json`            |

## CORS

- **Origins**: exact allowlist from `CORS_ORIGINS`. Never `*`.
- **Methods**: `GET`, `POST`, `OPTIONS`.
- **Headers**: `Content-Type`, plus the Yoga CSRF header `x-graphql-yoga-csrf`.
- **Credentials**: `true` (cookies).
- **Dev**: `http://localhost:5173`.
- **Prod**: `https://app.<domain>` (must be `https://`).

## Notes

- `DATABASE_URL` must include `sslmode=require` for Neon.
- `OTEL_EXPORTER_OTLP_ENDPOINT` is optional. When set, traces and metrics are exported via OTLP/HTTP. The exporters append `/v1/traces` and `/v1/metrics` automatically.
- `PERSISTED_DOCUMENTS_PATH` is required when `NODE_ENV=production` (trusted documents); the server fails fast at startup if it is missing or invalid. The manifest itself is generated in phase 4; deploy the API before the web.
- `TRUST_PROXY=cloudflare` is required when the API sits behind Cloudflare Tunnel so rate limiting sees the real client IP.
