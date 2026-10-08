/**
 * OpenTelemetry bootstrap, loaded before the application via
 * `node --import ./src/instrumentation.ts`.
 *
 * No-op unless OTEL_EXPORTER_OTLP_ENDPOINT is set, so tests, local dev and
 * builds without a collector pay nothing. The OTLP exporters read the same
 * variable for their URL (base + /v1/traces, /v1/metrics).
 */
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { defaultResource, resourceFromAttributes } from "@opentelemetry/resources";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";

function startTelemetry(): void {
  if (!process.env.OTEL_EXPORTER_OTLP_ENDPOINT) return;

  const sdk = new NodeSDK({
    resource: defaultResource().merge(
      resourceFromAttributes({ [ATTR_SERVICE_NAME]: "graphql-api" }),
    ),
    traceExporter: new OTLPTraceExporter(),
    metricReaders: [new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter() })],
    instrumentations: [
      new HttpInstrumentation(),
      new UndiciInstrumentation(),
      new PgInstrumentation(),
    ],
  });
  sdk.start();

  // Flush spans/metrics before exit; server.ts owns the HTTP shutdown.
  process.once("SIGTERM", () => {
    sdk.shutdown().catch((error: unknown) => {
      process.stderr.write(`telemetry shutdown failed: ${String(error)}\n`);
    });
  });
}

startTelemetry();
