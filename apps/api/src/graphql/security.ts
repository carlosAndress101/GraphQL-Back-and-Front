import { readFile } from "node:fs/promises";
import { useOpenTelemetry } from "@envelop/opentelemetry";
import { useCSRFPrevention } from "@graphql-yoga/plugin-csrf-prevention";
import { useDisableIntrospection } from "@graphql-yoga/plugin-disable-introspection";
import { usePersistedOperations } from "@graphql-yoga/plugin-persisted-operations";
import type { YogaServerOptions } from "graphql-yoga";
import { z } from "zod";
import type { Env } from "../infrastructure/config/env.ts";

/** Exactly what `createYoga({ plugins })` accepts, envelop plugins included. */
export type SecurityPluginList = NonNullable<
  YogaServerOptions<Record<string, unknown>, Record<string, unknown>>["plugins"]
>;

/**
 * Header clients must send so Yoga accepts the request (CSRF prevention).
 * Single source of truth: the Yoga plugin requires it, CORS allows it.
 */
export const CSRF_HEADER = "x-graphql-yoga-csrf";

/** sha256 hash → operation document, loaded from the persisted manifest. */
export type PersistedDocuments = Map<string, string>;

export type GraphqlSecurityOptions = {
  env: Pick<Env, "NODE_ENV">;
  persistedDocuments?: PersistedDocuments;
  /** True when OTel tracing is active. Never read process.env here. */
  telemetryEnabled: boolean;
};

/**
 * Yoga plugins for the protection layer. Query depth/alias/cost limits are
 * intentionally absent: graphql-armor requires graphql 16 (see report
 * PROPOSAL); add them here once the orchestrator decides.
 *
 * Deploy the API before the web: production only executes operations from the
 * manifest the API was built with, so a web deployed first would have its new
 * operations rejected.
 */
export function graphqlSecurityPlugins({
  env,
  persistedDocuments,
  telemetryEnabled,
}: GraphqlSecurityOptions): SecurityPluginList {
  const production = env.NODE_ENV === "production";
  const plugins: SecurityPluginList = [
    useCSRFPrevention({ requestHeaders: [CSRF_HEADER] }),
    usePersistedOperations({
      getPersistedOperation: (hash) => persistedDocuments?.get(hash) ?? null,
      allowArbitraryOperations: !production,
    }),
  ];
  if (production) plugins.push(useDisableIntrospection());
  if (telemetryEnabled) {
    // Variables and results stay out of spans; operation/resolver names suffice.
    plugins.push(useOpenTelemetry({ resolvers: true, variables: false, result: false }));
  }
  return plugins;
}

const PersistedManifestSchema = z.record(z.string(), z.string().min(1));

/** Loads and validates a persisted-documents manifest (`{ sha256Hash: document }`). */
export async function loadPersistedDocuments(path: string): Promise<PersistedDocuments> {
  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    throw new Error(`cannot read persisted documents manifest at ${path}`, { cause: error });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`invalid JSON in persisted documents manifest at ${path}`, { cause: error });
  }
  const result = PersistedManifestSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`invalid persisted documents manifest at ${path}`);
  }
  return new Map(Object.entries(result.data));
}
