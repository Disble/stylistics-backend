CREATE TABLE "document" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"external_document_key" uuid NOT NULL,
	"title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_user_external_document_key_unique" UNIQUE("user_id","external_document_key")
);
--> statement-breakpoint
CREATE TABLE "document_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"default_genre" text NOT NULL,
	"processing_config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_preferences_document_id_unique" UNIQUE("document_id"),
	CONSTRAINT "document_preferences_default_genre_check" CHECK ("document_preferences"."default_genre" IN ('narrativa-literaria', 'ensayo-academico', 'periodismo-cultural', 'general')),
	CONSTRAINT "document_preferences_processing_config_object_check" CHECK (jsonb_typeof("document_preferences"."processing_config") = 'object')
);
--> statement-breakpoint
CREATE TABLE "document_style_profile" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"profile_markdown" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_style_profile_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_preferences" ADD CONSTRAINT "document_preferences_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_style_profile" ADD CONSTRAINT "document_style_profile_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW."updated_at" = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER set_document_updated_at
BEFORE UPDATE ON "document"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_document_preferences_updated_at
BEFORE UPDATE ON "document_preferences"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER set_document_style_profile_updated_at
BEFORE UPDATE ON "document_style_profile"
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
