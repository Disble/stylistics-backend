import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: [
    "./src/auth/auth-schema.ts",
    "./src/infrastructure/persistence/schema/document.schemas.ts",
    "./src/infrastructure/persistence/schema/user-preferences.schemas.ts",
  ],
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.POSTGRES_URL ?? "",
  },
  migrations: {
    table: "__drizzle_migrations",
    schema: "drizzle",
  },
  strict: true,
  verbose: true,
});
