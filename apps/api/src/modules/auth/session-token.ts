import { createHash, randomBytes } from "node:crypto";

/** 32 random bytes, base64url-encoded (43 chars). Goes in the cookie only. */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** SHA-256 hex of the token. Only the hash is ever stored. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
