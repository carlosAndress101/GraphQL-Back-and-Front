import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type PagesFiles = {
  headers: string;
  redirects: string;
};

const LOCAL_API_URL = "http://localhost:4000";

/**
 * Resolves the API origin for the build. Production builds require
 * VITE_API_URL to be an absolute https URL and fail otherwise; anything else
 * falls back to local development (http://localhost allowed).
 */
export function resolveApiUrl(env: Record<string, string | undefined>): string {
  const production = env["NODE_ENV"] === "production";
  const raw = env["VITE_API_URL"];
  if (!raw) {
    if (production) {
      throw new Error("VITE_API_URL is required for production builds");
    }
    return LOCAL_API_URL;
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`VITE_API_URL is not an absolute URL: ${raw}`);
  }
  if (production && url.protocol !== "https:") {
    throw new Error(`VITE_API_URL must use https in production builds: ${raw}`);
  }
  return url.origin;
}

/**
 * Builds the contents of Cloudflare Pages `_headers` and `_redirects` for a
 * static SPA that talks to `apiOrigin`. The built app ships no inline
 * scripts or styles, so the CSP needs no 'unsafe-inline'.
 */
export function buildPagesFiles(apiOrigin: string): PagesFiles {
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${apiOrigin}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
  const headers = `/*
  Content-Security-Policy: ${csp}
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Cross-Origin-Opener-Policy: same-origin
/assets/*
  Cache-Control: public, max-age=31536000, immutable
/index.html
  Cache-Control: no-cache
`;
  return { headers, redirects: "/* /index.html 200\n" };
}

function main(): void {
  const apiUrl = resolveApiUrl(process.env);
  const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
  mkdirSync(outDir, { recursive: true });
  const files = buildPagesFiles(apiUrl);
  writeFileSync(join(outDir, "_headers"), files.headers);
  writeFileSync(join(outDir, "_redirects"), files.redirects);
  process.stdout.write(`pages files written for ${apiUrl}\n`);
}

main();
