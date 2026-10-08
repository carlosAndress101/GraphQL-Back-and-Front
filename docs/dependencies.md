# Dependencies

## Legacy audit (2026-10-08)

The old stack (deleted in commit `d27a434`) had:

- **API**: 37 vulnerabilities (5 critical, 11 high, 12 moderate, 9 low). Critical: mongoose prototype pollution + search injection, proxy-addr IP spoofing, form-data unsafe boundary, sha.js. High: `@apollo/server` DoS, body-parser DoS, path-to-regexp ReDoS, `@graphql-tools/utils` prototype pollution, ip SSRF.
- **Web**: 50 vulnerabilities (1 critical `@babel/traverse`; 19 high including vite `fs.deny` bypasses, rollup, postcss, `@remix-run/router` open-redirect XSS, nanoid).

Old stack: Express 4.18, Apollo Server 4.3 (EOL), Mongoose 6.9, React 18, Vite 4, Apollo Client 3, react-router-dom 6.8, Tailwind 3.

## New stack

| Package                                     | Why                                                                 |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `hono`                                      | HTTP framework; Fetch-native, built-in cors/secureHeaders/bodyLimit |
| `@hono/node-server`                         | Node.js adapter for Hono                                            |
| `graphql`                                   | GraphQL execution                                                   |
| `graphql-yoga`                              | GraphQL server; error masking, CSRF, plugins                        |
| `zod`                                       | Runtime validation; env and input schemas                           |
| `drizzle-orm`                               | Type-safe SQL; schema is the source of truth                        |
| `pg`                                        | PostgreSQL driver (Neon in dev/prod)                                |
| `dataloader`                                | Per-request batching to prevent N+1                                 |
| `@opentelemetry/sdk-trace-node`             | Tracer provider + span processors (no auto-config)                  |
| `@opentelemetry/instrumentation`            | `registerInstrumentations` + ESM loader hook                        |
| `@opentelemetry/exporter-trace-otlp-http`   | OTLP trace exporter (HTTP)                                          |
| `@opentelemetry/exporter-metrics-otlp-http` | OTLP metric exporter (HTTP)                                         |
| `@opentelemetry/sdk-metrics`                | Metric reader                                                       |
| `@opentelemetry/resources`                  | Resource attributes (service.name)                                  |
| `@opentelemetry/semantic-conventions`       | Standard attribute names                                            |
| `@opentelemetry/instrumentation-http`       | HTTP server/client spans                                            |
| `@opentelemetry/instrumentation-undici`     | fetch/undici spans                                                  |
| `@opentelemetry/instrumentation-pg`         | PostgreSQL query spans                                              |
| `@opentelemetry/api`                        | OpenTelemetry API (peer of instrumentations)                        |

### Dev dependencies

| Package                | Why                            |
| ---------------------- | ------------------------------ |
| `typescript`           | Type checking (`tsc --noEmit`) |
| `@types/node`          | Node.js type definitions       |
| `@types/pg`            | `pg` type definitions          |
| `vitest`               | Test runner                    |
| `vite`                 | Vitest's underlying bundler    |
| `drizzle-kit`          | Migration generation           |
| `@electric-sql/pglite` | In-process Postgres for tests  |

### Root dev dependencies

| Package      | Why                                 |
| ------------ | ----------------------------------- |
| `oxlint`     | Linter                              |
| `oxfmt`      | Formatter                           |
| `typescript` | Shared TypeScript for the workspace |

## Audit policy

CI audits only `@app/api` production dependencies at `high` severity:

```sh
pnpm --filter @app/api audit --prod --audit-level high --ignore GHSA-7mx3-vvmw-hjmv
```

`apps/web` stays on the legacy stack until the phase 4 rewrite. Its known advisories must not block CI.

`GHSA-7mx3-vvmw-hjmv` is a transitive advisory in `@graphql-tools/utils` (via `graphql-yoga`). It is ignored until the upstream fix lands in a graphql-yoga release we can adopt.

## Transitive note

Tracing is wired from minimal building blocks (`NodeTracerProvider` + `BatchSpanProcessor`, `MeterProvider` + `PeriodicExportingMetricReader`, `registerInstrumentations`) instead of `@opentelemetry/sdk-node`, so no gRPC exporter packages (`@grpc/grpc-js`, `protobufjs`) enter the production dependency tree.
