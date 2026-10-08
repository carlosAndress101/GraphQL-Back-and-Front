// Proves ESM auto-instrumentation works in a real node process: registers the
// loader hook first (exactly like src/instrumentation.ts), sets up tracing
// with an in-memory exporter, performs a real node:http request against a
// local server, and prints the finished span names as JSON.
import { register } from "node:module";

register("@opentelemetry/instrumentation/hook.mjs", import.meta.url);

const { NodeTracerProvider, BatchSpanProcessor, InMemorySpanExporter } =
  await import("@opentelemetry/sdk-trace-node");
const { HttpInstrumentation } = await import("@opentelemetry/instrumentation-http");
const { registerInstrumentations } = await import("@opentelemetry/instrumentation");

const exporter = new InMemorySpanExporter();
const provider = new NodeTracerProvider({
  spanProcessors: [new BatchSpanProcessor(exporter)],
});
provider.register();
registerInstrumentations({ instrumentations: [new HttpInstrumentation()] });

const http = await import("node:http");
const server = http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("ok");
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
if (address === null || typeof address !== "object") {
  throw new Error("server has no address");
}
await new Promise((resolve, reject) => {
  http
    .get(`http://127.0.0.1:${address.port}/hello`, (res) => {
      res.resume();
      res.on("end", resolve);
    })
    .on("error", reject);
});
await provider.forceFlush();
await new Promise((resolve) => server.close(resolve));
const names = exporter.getFinishedSpans().map((span) => span.name);
process.stdout.write(`${JSON.stringify(names)}\n`);
await provider.shutdown();
if (names.length === 0) process.exitCode = 1;
