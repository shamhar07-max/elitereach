CREATE TYPE "public"."access_type" AS ENUM('official_api', 'manual_import', 'rss', 'other');--> statement-breakpoint
CREATE TYPE "public"."commercial_class" AS ENUM('micro', 'standard', 'premium', 'group', 'corporate', 'strategic');--> statement-breakpoint
CREATE TYPE "public"."opportunity_type" AS ENUM('direct_lead', 'early_intent', 'b2b_opportunity', 'partnership', 'content_gap', 'product_opportunity', 'market_trend', 'customer_support', 'reputation_risk', 'competitor_signal', 'spam', 'irrelevant');--> statement-breakpoint
CREATE TYPE "public"."production_level" AS ENUM('production', 'beta', 'experimental', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('owner', 'admin', 'analyst', 'reviewer', 'read_only');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"actor_user_id" integer,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer,
	"detail" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"connector_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"objective" text,
	"destinations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"origin_locations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"services" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"keywords" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"daily_limit" integer,
	"start_at" timestamp,
	"end_at" timestamp,
	"owner_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connector_health" (
	"connector_id" integer PRIMARY KEY NOT NULL,
	"health" text DEFAULT 'unknown' NOT NULL,
	"last_successful_run_at" timestamp,
	"last_error_at" timestamp,
	"last_error_message" text,
	"rate_limit_remaining" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "connector_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"connector_id" integer NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"status" text DEFAULT 'running' NOT NULL,
	"signals_ingested" integer DEFAULT 0 NOT NULL,
	"error_message" text
);
--> statement-breakpoint
CREATE TABLE "connectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"source" text NOT NULL,
	"access_type" "access_type" NOT NULL,
	"commercial_use_status" text DEFAULT 'requires_review' NOT NULL,
	"production_level" "production_level" DEFAULT 'experimental' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intent_extractions" (
	"id" serial PRIMARY KEY NOT NULL,
	"signal_id" integer NOT NULL,
	"origin" text,
	"destination" text,
	"trip_type" text,
	"traveler_count_hint" integer,
	"budget_aed_hint" real,
	"purchase_stage" text,
	"urgency" text,
	"segment" text DEFAULT 'd2c' NOT NULL,
	"confidence" real DEFAULT 0 NOT NULL,
	"extraction_method" text DEFAULT 'rule_v1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intent_scores" (
	"id" serial PRIMARY KEY NOT NULL,
	"signal_id" integer NOT NULL,
	"total_score" integer NOT NULL,
	"purchase_intent" integer NOT NULL,
	"timeline_urgency" integer NOT NULL,
	"uae_relevance" integer NOT NULL,
	"service_fit" integer NOT NULL,
	"commercial_value" integer NOT NULL,
	"destination_fit" integer NOT NULL,
	"group_value" integer NOT NULL,
	"engagement" integer NOT NULL,
	"data_confidence" integer NOT NULL,
	"reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scoring_version" text DEFAULT 'v1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"signal_id" integer NOT NULL,
	"opportunity_type" "opportunity_type" NOT NULL,
	"commercial_class" "commercial_class",
	"priority_decay_at" timestamp,
	"expires_at" timestamp,
	"status" text DEFAULT 'open' NOT NULL,
	"crm_lead_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunity_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"opportunity_id" integer NOT NULL,
	"event" text NOT NULL,
	"actor_user_id" integer,
	"detail" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"connector_id" integer NOT NULL,
	"campaign_id" integer,
	"source" text NOT NULL,
	"source_record_id" text NOT NULL,
	"source_url" text,
	"source_thread_id" text,
	"author_external_id" text,
	"author_display_name" text,
	"published_at" timestamp,
	"collected_at" timestamp DEFAULT now() NOT NULL,
	"language" text,
	"text_original" text NOT NULL,
	"text_normalized" text NOT NULL,
	"engagement_likes" integer DEFAULT 0,
	"engagement_comments" integer DEFAULT 0,
	"location_hint" text,
	"source_access_class" text NOT NULL,
	"raw_payload_hash" text NOT NULL,
	"dedupe_hash" text NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" integer NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"full_name" text NOT NULL,
	"role" "role" DEFAULT 'analyst' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_sources" ADD CONSTRAINT "campaign_sources_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_sources" ADD CONSTRAINT "campaign_sources_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_health" ADD CONSTRAINT "connector_health_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connector_runs" ADD CONSTRAINT "connector_runs_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connectors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connectors" ADD CONSTRAINT "connectors_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intent_extractions" ADD CONSTRAINT "intent_extractions_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intent_scores" ADD CONSTRAINT "intent_scores_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_events" ADD CONSTRAINT "opportunity_events_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_events" ADD CONSTRAINT "opportunity_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_connector_id_connectors_id_fk" FOREIGN KEY ("connector_id") REFERENCES "public"."connectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "connector_runs_connector_idx" ON "connector_runs" USING btree ("connector_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intent_extractions_signal_idx" ON "intent_extractions" USING btree ("signal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "intent_scores_signal_idx" ON "intent_scores" USING btree ("signal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "opportunities_signal_idx" ON "opportunities" USING btree ("signal_id");--> statement-breakpoint
CREATE INDEX "opportunities_status_idx" ON "opportunities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "opportunities_type_idx" ON "opportunities" USING btree ("opportunity_type");--> statement-breakpoint
CREATE UNIQUE INDEX "signals_dedupe_idx" ON "signals" USING btree ("tenant_id","dedupe_hash");--> statement-breakpoint
CREATE INDEX "signals_tenant_idx" ON "signals" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "signals_status_idx" ON "signals" USING btree ("processing_status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_email_idx" ON "users" USING btree ("tenant_id","email");