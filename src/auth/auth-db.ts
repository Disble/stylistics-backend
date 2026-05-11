import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { authSchema } from "./auth-schema";

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "POSTGRES_URL is required to initialize Better Auth storage.",
  );
}

export const authPool = new Pool({ connectionString });

export const authDb = drizzle(authPool, {
  schema: authSchema,
});
