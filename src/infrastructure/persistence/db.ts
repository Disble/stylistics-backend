import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { authSchema } from "../../auth/auth-schema";
import { documentSchema } from "./schema/document.schemas";
import { userPreferencesSchema } from "./schema/user-preferences.schemas";

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  throw new Error(
    "POSTGRES_URL is required to initialize persistence storage.",
  );
}

export const persistencePool = new Pool({ connectionString });

export const persistenceSchema = {
  ...authSchema,
  ...documentSchema,
  ...userPreferencesSchema,
};

export const persistenceDb = drizzle(persistencePool, {
  schema: persistenceSchema,
});
