import { isIP } from "node:net";
import type { Env } from "../infrastructure/config/env.ts";

export type ClientIpInput = {
  headers: Headers;
  remoteAddress: string | undefined;
  trustProxy: Env["TRUST_PROXY"];
};

/**
 * Resolves the client IP. Only when `trustProxy` is `"cloudflare"` is
 * `CF-Connecting-IP` honored (validated as an IP); otherwise every forwarding
 * header is ignored and the socket address is used. Falls back to `"unknown"`.
 */
export function getClientIp({ headers, remoteAddress, trustProxy }: ClientIpInput): string {
  if (trustProxy === "cloudflare") {
    const forwarded = headers.get("CF-Connecting-IP")?.trim();
    if (forwarded && isIP(forwarded) !== 0) return forwarded;
  }
  const remote = remoteAddress?.trim() ?? "";
  if (remote && isIP(remote) !== 0) return remote;
  return "unknown";
}
