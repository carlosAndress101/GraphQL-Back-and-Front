import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // scrypt (~100 ms and 32 MiB per hash) plus one PGlite (WASM Postgres)
    // per test file contend for CPU and memory under parallel workers — and
    // other agents share this machine. Generous timeouts plus bounded
    // parallelism keep the suite deterministic instead of fast-but-flaky.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    maxWorkers: 2,
  },
});
