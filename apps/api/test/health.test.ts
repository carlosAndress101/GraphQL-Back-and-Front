import { describe, expect, it } from "vitest";
import { createHealthRoutes } from "../src/http/health.ts";

describe("createHealthRoutes", () => {
  it("liveness always returns 200", async () => {
    const app = createHealthRoutes({
      checkDatabase: async () => {
        throw new Error("db down");
      },
    });
    const res = await app.request("/health/live");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });

  it("readiness returns 200 when the database check resolves", async () => {
    const app = createHealthRoutes({
      checkDatabase: async () => {
        // ok
      },
    });
    const res = await app.request("/health/ready");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });

  it("readiness returns 503 without leaking error details", async () => {
    const app = createHealthRoutes({
      checkDatabase: async () => {
        throw new Error("connect ECONNREFUSED password=hunter2");
      },
    });
    const res = await app.request("/health/ready");
    expect(res.status).toBe(503);
    const bodyText = await res.text();
    expect(bodyText).not.toContain("hunter2");
    expect(bodyText).not.toContain("ECONNREFUSED");
    const body = JSON.parse(bodyText);
    expect(body).toEqual({ status: "unavailable" });
  });
});
