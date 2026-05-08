import { sql } from "drizzle-orm";
import {
  check,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { user } from "../../../auth/auth-schema";

export const document = pgTable(
  "document",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    externalDocumentKey: uuid("external_document_key").notNull(),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("document_user_external_document_key_unique").on(
      table.userId,
      table.externalDocumentKey,
    ),
  ],
);

export const documentPreferences = pgTable(
  "document_preferences",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .unique()
      .references(() => document.id, { onDelete: "cascade" }),
    defaultGenre: text("default_genre").notNull(),
    processingConfig: jsonb("processing_config")
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "document_preferences_default_genre_check",
      sql`${table.defaultGenre} IN ('narrativa-literaria', 'ensayo-academico', 'periodismo-cultural', 'general')`,
    ),
    check(
      "document_preferences_processing_config_object_check",
      sql`jsonb_typeof(${table.processingConfig}) = 'object'`,
    ),
  ],
);

export const documentStyleProfile = pgTable("document_style_profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .unique()
    .references(() => document.id, { onDelete: "cascade" }),
  profileMarkdown: text("profile_markdown").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const documentSchema = {
  document,
  documentPreferences,
  documentStyleProfile,
};
