import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

type ScryptParams = { N: number; r: number; p: number; maxmem: number };

function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptParams,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const N = 32768; // 2^15
const R = 8;
const P = 1;
// 128*N*r*p = 32 MiB; headroom so hashing and verification never hit the cap.
// Doubles as a DoS bound: oversized params from a tampered hash throw and fail closed.
const MAXMEM = 64 * 1024 * 1024;

type ParsedHash = {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
};

function parseStored(stored: string): ParsedHash | undefined {
  const parts = stored.split("$");
  if (parts.length !== 6) return undefined;
  const [prefix, nRaw, rRaw, pRaw, saltB64, hashB64] = parts;
  if (prefix !== "scrypt") return undefined;
  if (nRaw === undefined || rRaw === undefined || pRaw === undefined) return undefined;
  if (saltB64 === undefined || hashB64 === undefined) return undefined;
  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) return undefined;
  if (n < 2 || r < 1 || p < 1) return undefined;
  if (!Number.isInteger(Math.log2(n))) return undefined;
  const salt = Buffer.from(saltB64, "base64");
  const hash = Buffer.from(hashB64, "base64");
  if (salt.length === 0 || hash.length === 0) return undefined;
  return { N: n, r, p, salt, hash };
}

/** scrypt hash in `scrypt$N$r$p$saltB64$hashB64` format. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(password, salt, KEY_BYTES, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`;
}

/**
 * Parses N/r/p from the stored string, so params can be raised later without
 * breaking old hashes. False for wrong passwords and malformed values — never throws.
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = parseStored(stored);
  if (!parsed) return false;
  let candidate: Buffer;
  try {
    candidate = await scryptAsync(password, parsed.salt, parsed.hash.length, {
      N: parsed.N,
      r: parsed.r,
      p: parsed.p,
      maxmem: MAXMEM,
    });
  } catch {
    return false;
  }
  return candidate.length === parsed.hash.length && timingSafeEqual(candidate, parsed.hash);
}

const DUMMY_HASH = [
  "scrypt",
  String(N),
  String(R),
  String(P),
  Buffer.alloc(SALT_BYTES).toString("base64"),
  Buffer.alloc(KEY_BYTES).toString("base64"),
].join("$");

/**
 * Burns one scrypt so an unknown email costs the same as a wrong password
 * (anti user-enumeration). Always resolves false.
 */
export async function verifyAgainstDummyHash(password: string): Promise<false> {
  await verifyPassword(password, DUMMY_HASH);
  return false;
}
