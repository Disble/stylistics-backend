import { sql } from "drizzle-orm";
import {
  check,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../../../auth/auth-schema";
import { CORRECTION_INSTRUCTIONS_MAX_LENGTH } from "../../../domain/user-preferences/user-preferences.constants";

export const userPreferences = pgTable(
  "user_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    correctionInstructions: text("correction_instructions")
      .notNull()
      .default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("user_preferences_user_id_unique").on(table.userId),
    check(
      "user_preferences_correction_instructions_length_check",
      sql`char_length(${table.correctionInstructions}) <= ${sql.raw(String(CORRECTION_INSTRUCTIONS_MAX_LENGTH))}`,
    ),
  ],
);

export const userPreferencesSchema = {
  userPreferences,
};
