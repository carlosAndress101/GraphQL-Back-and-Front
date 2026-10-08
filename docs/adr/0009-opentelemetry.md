# ADR 0009: OpenTelemetry

## Problem

We need traces and metrics in production, but telemetry must not run in tests or local development unless explicitly configured.

## Decision

OpenTelemetry via OTLP/HTTP, activated only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. Loaded with `node --import ./src/instrumentation.ts` so instrumentations patch modules before the app starts.

## Alternatives considered

- **Always on**: noisy in tests, requires a collector locally.
- **Custom logging only**: no distributed tracing, no metrics.
- **Vendor SDK (Datadog, New Relic)**: lock-in; OTLP is vendor-neutral.

## Reason

OTLP is the standard. Gating on an environment variable means zero overhead when unset. The Node SDK with HTTP, undici, and `pg` instrumentations covers the request path and database calls.

## Consequences

- Service name is `graphql-api`.
- Traces and metrics export to the configured endpoint.
- GraphQL-level spans require the `@envelop/opentelemetry` plugin (added in a later round).
- `@opentelemetry/sdk-node` pulls in unused gRPC exporter packages transitively.
