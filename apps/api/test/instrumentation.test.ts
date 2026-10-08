import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type FixtureResult = {
  code: number;
  stdout: string;
  stderr: string;
};

function runFixture(script: string): Promise<FixtureResult> {
  const env: Record<string, string | undefined> = { ...process.env };
  delete env.OTEL_EXPORTER_OTLP_ENDPOINT;
  return new Promise((resolve) => {
    execFile(process.execPath, [script], { env, timeout: 20000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ code: typeof error.code === "number" ? error.code : 1, stdout, stderr });
        return;
      }
      resolve({ code: 0, stdout, stderr });
    });
  });
}

describe("ESM instrumentation", () => {
  it("produces spans for a real node:http request under native ESM", async () => {
    const script = fileURLToPath(new URL("./fixtures/otel-esm-check.mjs", import.meta.url));
    const result = await runFixture(script);
    expect(result.code).toBe(0);
    const names: unknown = JSON.parse(result.stdout);
    expect(names).toEqual(expect.arrayContaining([expect.any(String)]));
  }, 30000);
});
