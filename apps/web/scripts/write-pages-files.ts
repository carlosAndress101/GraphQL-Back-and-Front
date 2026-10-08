import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type PagesFiles = {
  headers: string;
  redirects: string;
};

/**
 * Resolves the API origin for the build. VITE_API_URL is always required —
 * a build must never silently fall back to localhost (Cloudflare Pages does
 * not set NODE_ENV, so environment sniffing can't tell prod from dev).
 * https is mandatory except for local loopback hosts, so local
 * `pnpm build` + preview keeps working.
 */
export function resolveApiUrl(env: Record<string, string | undefined>): string {
  const raw = env["VITE_API_URL"];
  if (!raw) {
    throw new Error(
      "VITE_API_URL is required to build the web app (https://api.<domain> in production, http://localhost:4000 for local builds)",
    );
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`VITE_API_URL is not an absolute URL: ${raw}`);
  }
  const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!loopback && url.protocol !== "https:") {
    throw new Error(`VITE_API_URL must use https (except http://localhost for local builds): ${raw}`);
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

const entrypoint = process.argv[1];
if (entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href) {
  main();
}
