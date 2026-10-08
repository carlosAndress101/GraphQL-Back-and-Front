/**
 * OpenTelemetry bootstrap, loaded before the application via
 * `node --import ./src/instrumentation.ts`.
 *
 * No-op unless OTEL_EXPORTER_OTLP_ENDPOINT is set, so tests, local dev and
 * builds without a collector pay nothing. The OTLP exporters read the same
 * variable for their URL (base + /v1/traces, /v1/metrics).
 *
 * The app is native ESM, so auto-instrumentation needs the import-in-the-middle
 * loader hook. It is registered first and everything else is imported
 * dynamically afterwards: an ESM namespace is frozen once loaded, so a module
 * imported before the hook existed (e.g. `node:http` pulled in by an exporter)
 * could never be patched.
 *
 * `server.ts` owns SIGTERM/SIGINT and calls `shutdownTelemetry()` after
 * closing HTTP and the DB pool.
 */
import { register } from "node:module";

type Telemetry = {
  shutdown: () => Promise<void>;
};

let telemetry: Telemetry | undefined;

async function startTelemetry(): Promise<void> {
  if (telemetry) return;
  register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);

  const { defaultResource, resourceFromAttributes } = await import("@opentelemetry/resources");
  const { ATTR_SERVICE_NAME } = await import("@opentelemetry/semantic-conventions");
  const { NodeTracerProvider, BatchSpanProcessor } = await import("@opentelemetry/sdk-trace-node");
  const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-http");
  const { MeterProvider, PeriodicExportingMetricReader } =
    await import("@opentelemetry/sdk-metrics");
  const { OTLPMetricExporter } = await import("@opentelemetry/exporter-metrics-otlp-http");
  const { registerInstrumentations } = await import("@opentelemetry/instrumentation");
  const { HttpInstrumentation } = await import("@opentelemetry/instrumentation-http");
  const { UndiciInstrumentation } = await import("@opentelemetry/instrumentation-undici");
  const { PgInstrumentation } = await import("@opentelemetry/instrumentation-pg");
  const { metrics } = await import("@opentelemetry/api");

  const resource = defaultResource().merge(
    resourceFromAttributes({ [ATTR_SERVICE_NAME]: "graphql-api" }),
  );

  const tracerProvider = new NodeTracerProvider({
    resource,
    spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  });
  tracerProvider.register();

  const meterProvider = new MeterProvider({
    resource,
    readers: [new PeriodicExportingMetricReader({ exporter: new OTLPMetricExporter() })],
  });
  metrics.setGlobalMeterProvider(meterProvider);

  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      new UndiciInstrumentation(),
      new PgInstrumentation(),
    ],
  });

  telemetry = {
    shutdown: async () => {
      await tracerProvider.shutdown();
      await meterProvider.shutdown();
    },
  };
}

/** Flushes traces and metrics. No-op when telemetry never started. */
export async function shutdownTelemetry(): Promise<void> {
  if (!telemetry) return;
  const active = telemetry;
  telemetry = undefined;
  await active.shutdown();
}

if (process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
  await startTelemetry();
}
