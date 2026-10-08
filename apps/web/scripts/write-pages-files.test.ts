import { describe, expect, it } from "vitest";
import { buildPagesFiles, resolveApiUrl } from "./write-pages-files.ts";

describe("buildPagesFiles", () => {
  it("names the API origin in connect-src and nothing else dynamic", () => {
    const files = buildPagesFiles("https://api.example.com");
    expect(files.headers).toContain("connect-src 'self' https://api.example.com");
    expect(files.headers).toContain("default-src 'self'");
    expect(files.headers).toContain("script-src 'self'");
    expect(files.headers).toContain("frame-ancestors 'none'");
    expect(files.headers).toContain("Strict-Transport-Security: max-age=31536000; includeSubDomains");
    expect(files.headers).toContain("X-Content-Type-Options: nosniff");
    expect(files.headers).toContain("Referrer-Policy: strict-origin-when-cross-origin");
    expect(files.headers).toContain("Permissions-Policy: camera=(), microphone=(), geolocation=()");
    expect(files.headers).toContain("Cross-Origin-Opener-Policy: same-origin");
    expect(files.headers).toContain("/assets/*\n  Cache-Control: public, max-age=31536000, immutable");
    expect(files.headers).toContain("/index.html\n  Cache-Control: no-cache");
    expect(files.headers).not.toContain("unsafe-inline");
    expect(files.redirects).toBe("/* /index.html 200\n");
  });
});

describe("resolveApiUrl", () => {
  it("requires VITE_API_URL and absolute URLs", () => {
    expect(resolveApiUrl({ VITE_API_URL: "https://api.example.com" })).toBe(
      "https://api.example.com",
    );
    expect(() => resolveApiUrl({})).toThrow("VITE_API_URL is required");
    expect(() => resolveApiUrl({ VITE_API_URL: "" })).toThrow("VITE_API_URL is required");
    expect(() => resolveApiUrl({ VITE_API_URL: "not-a-url" })).toThrow("absolute URL");
  });

  it("requires https except for loopback hosts", () => {
    expect(resolveApiUrl({ VITE_API_URL: "http://localhost:4000" })).toBe(
      "http://localhost:4000",
    );
    expect(resolveApiUrl({ VITE_API_URL: "http://127.0.0.1:4000/graphql" })).toBe(
      "http://127.0.0.1:4000",
    );
    expect(() => resolveApiUrl({ VITE_API_URL: "http://api.example.com" })).toThrow("https");
  });

  it("strips paths down to the origin", () => {
    expect(resolveApiUrl({ VITE_API_URL: "https://api.example.com/graphql" })).toBe(
      "https://api.example.com",
    );
  });
});
