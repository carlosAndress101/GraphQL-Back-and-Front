import { Buffer } from "node:buffer";
import { z } from "zod";

const cursorSchema = z.strictObject({
  createdAt: z.iso.datetime().transform((createdAt) => new Date(createdAt)),
  id: z.uuid(),
});

const base64UrlPattern = /^[A-Za-z0-9_-]+$/;

export type Cursor = {
  createdAt: Date;
  id: string;
};

export class InvalidCursorError extends Error {
  constructor() {
    super("Invalid cursor");
    this.name = "InvalidCursorError";
  }
}

export function encodeCursor(cursor: Cursor): string {
  const payload = JSON.stringify({ createdAt: cursor.createdAt.toISOString(), id: cursor.id });
  return Buffer.from(payload).toString("base64url");
}

export function decodeCursor(value: unknown): Cursor {
  if (typeof value !== "string" || !base64UrlPattern.test(value)) {
    throw new InvalidCursorError();
  }

  try {
    const decoded = Buffer.from(value, "base64url");
    if (decoded.toString("base64url") !== value) {
      throw new InvalidCursorError();
    }

    return cursorSchema.parse(JSON.parse(decoded.toString("utf8")));
  } catch {
    throw new InvalidCursorError();
  }
}
