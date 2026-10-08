import { defineConfig } from "drizzle-kit";

// `generate` works offline; only `migrate` needs a connection string.
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/infrastructure/database/schema.ts",
  out: "./src/infrastructure/database/migrations",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
