import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
  schema: "./src/graphql/schema.graphql",
  // `.ts` extensions: the generated file is types-only, and our tsconfig
  // typechecks `.ts` imports natively (allowImportingTsExtensions).
  importExtension: ".ts",
  generates: {
    "./src/graphql/__generated__/resolvers-types.ts": {
      config: {
        contextType: "../context.ts#GraphQLContext",
        mappers: {
          User: "../../modules/auth/auth.service.ts#AuthUser",
          Project: "../../modules/projects/project.types.ts#Project as ProjectModel",
          Task: "../../modules/tasks/task.types.ts#Task as TaskModel",
        },
        scalars: { DateTime: "Date" },
        useTypeImports: true,
        enumsAsTypes: true,
      },
      plugins: ["typescript", "typescript-resolvers"],
    },
  },
};

export default config;
