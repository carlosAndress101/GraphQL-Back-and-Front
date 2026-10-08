import type { CodegenConfig } from "@graphql-codegen/cli";

// The API's SDL is the single source of truth for every operation type.
const config: CodegenConfig = {
  schema: "../api/src/graphql/schema.graphql",
  documents: ["src/**/*.{ts,tsx}", "!src/gql/**"],
  ignoreNoDocuments: true,
  generates: {
    "./src/gql/": {
      preset: "client",
      presetConfig: {
        fragmentMasking: false,
        // Emits persisted-documents.json (sha256 → operation) for the API allow-list.
        persistedDocuments: { hashAlgorithm: "sha256" },
      },
      config: {
        documentMode: "string",
        useTypeImports: true,
        enumsAsTypes: true,
        scalars: { DateTime: "string" },
      },
    },
  },
};

export default config;
