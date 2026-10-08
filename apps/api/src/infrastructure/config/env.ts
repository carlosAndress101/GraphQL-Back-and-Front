import { z } from "zod";

const commaSeparated = z.string().transform((value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean),
);

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    // Exact browser origins allowed to call the API with credentials. Never "*".
    CORS_ORIGINS: commaSeparated.pipe(z.array(z.url()).min(1)),
    SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),
    // "cloudflare": trust CF-Connecting-IP for the client IP (API behind Cloudflare Tunnel).
    TRUST_PROXY: z.enum(["none", "cloudflare"]).default("none"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== "production") return;
    for (const origin of env.CORS_ORIGINS) {
      if (!origin.startsWith("https://")) {
        ctx.addIssue({
          code: "custom",
          path: ["CORS_ORIGINS"],
          message: `Production origins must use https: ${origin}`,
        });
      }
    }
  });

export type Env = z.infer<typeof EnvSchema>;

/** Validates configuration once at startup so the process fails fast on bad config. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
