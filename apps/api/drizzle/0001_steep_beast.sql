CREATE TYPE "public"."journey_status" AS ENUM('active', 'converted', 'abandoned');--> statement-breakpoint
CREATE TABLE "journey_signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"journey_id" integer NOT NULL,
	"signal_id" integer NOT NULL,
	"sequence_number" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journeys" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"source_identity_id" integer NOT NULL,
	"status" "journey_status" DEFAULT 'active' NOT NULL,
	"latest_purchase_stage" text,
	"latest_urgency" text,
	"signal_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_signal_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_identities" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"source" text NOT NULL,
	"author_external_id" text NOT NULL,
	"author_display_name" text,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "journey_signals" ADD CONSTRAINT "journey_signals_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_signals" ADD CONSTRAINT "journey_signals_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_source_identity_id_source_identities_id_fk" FOREIGN KEY ("source_identity_id") REFERENCES "public"."source_identities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_identities" ADD CONSTRAINT "source_identities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "journey_signals_signal_idx" ON "journey_signals" USING btree ("signal_id");--> statement-breakpoint
CREATE INDEX "journey_signals_journey_idx" ON "journey_signals" USING btree ("journey_id");--> statement-breakpoint
CREATE INDEX "journeys_identity_idx" ON "journeys" USING btree ("source_identity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "source_identities_idx" ON "source_identities" USING btree ("tenant_id","source","author_external_id");