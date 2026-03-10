import { PostgresStore } from "@mastra/pg";

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL environment variable is not set");
}

export const pgStore = new PostgresStore({
  id: 'pg-storage',
  connectionString: process.env.POSTGRES_URL,
}) 
