CREATE TYPE "public"."taxonomy_category" AS ENUM('destination_alias', 'origin_keyword', 'trip_type_keyword', 'ready_to_buy_phrase', 'comparison_phrase', 'discovery_phrase');--> statement-breakpoint
CREATE TABLE "taxonomy_terms" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"category" "taxonomy_category" NOT NULL,
	"term" text NOT NULL,
	"canonical_value" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "taxonomy_terms" ADD CONSTRAINT "taxonomy_terms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "taxonomy_terms_unique_idx" ON "taxonomy_terms" USING btree ("tenant_id","category","term");