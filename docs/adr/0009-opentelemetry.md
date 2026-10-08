# ADR 0009: OpenTelemetry

## Context

We need traces and metrics in production, but telemetry must not run in tests or local development unless explicitly configured.

## Options

- **Always on**: noisy in tests, requires a collector locally.
- **Custom logging only**: no distributed tracing, no metrics.
- **Vendor SDK (Datadog, New Relic)**: lock-in; OTLP is vendor-neutral.
- **Full `@opentelemetry/sdk-node`**: pulls unused gRPC exporter packages into the production image.

## Decision

OpenTelemetry via OTLP/HTTP, activated only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Loaded with `node --import ./src/instrumentation.ts` so instrumentations patch modules before the app starts. Wired from minimal building blocks (`NodeTracerProvider` + `BatchSpanProcessor`, `MeterProvider` + `PeriodicExportingMetricReader`, `registerInstrumentations`) instead of `@opentelemetry/sdk-node`. The app is native ESM, so the import-in-the-middle loader hook is registered before anything else loads. Telemetry shuts down through an exported `shutdownTelemetry()`; `instrumentation.ts` registers no signal handlers.

## Reason

OTLP is the standard. Gating on an environment variable means zero overhead when unset. Minimal building blocks keep unused gRPC exporter packages out of the production image. HTTP, undici, and `pg` instrumentations cover the request path and database calls. A span test with a real `node:http` request proves the ESM hook works.

## Consequences

- Service name is `graphql-api`.
- Traces and metrics export to the configured endpoint.
- GraphQL-level spans require the `@envelop/opentelemetry` plugin (added in a later round).
- `server.ts` owns SIGTERM/SIGINT and calls `shutdownTelemetry()` after closing HTTP and the DB pool.

## Date

2026-10-08
